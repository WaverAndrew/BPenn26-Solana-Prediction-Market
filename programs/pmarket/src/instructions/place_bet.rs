use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::{Config, Market, MarketState, Outcome, Position};
use crate::errors::PmarketError;

#[derive(Accounts)]
pub struct PlaceBet<'info> {
    #[account(mut)]
    pub bettor: Signer<'info>,

    #[account(
        seeds = [b"config"],
        bump = config.bump,
    )]
    pub config: Account<'info, Config>,

    #[account(
        mut,
        seeds = [b"market", market.id.to_le_bytes().as_ref()],
        bump = market.bump,
    )]
    pub market: Account<'info, Market>,

    /// CHECK: Market vault PDA
    #[account(
        mut,
        seeds = [b"vault", market.id.to_le_bytes().as_ref()],
        bump = market.vault_bump,
    )]
    pub market_vault: UncheckedAccount<'info>,

    #[account(
        init_if_needed,
        payer = bettor,
        space = Position::SIZE,
        seeds = [b"position", market.id.to_le_bytes().as_ref(), bettor.key().as_ref()],
        bump,
    )]
    pub position: Account<'info, Position>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<PlaceBet>, outcome: u8, amount: u64) -> Result<()> {
    require!(!ctx.accounts.config.paused, PmarketError::ProtocolPaused);
    require!(amount > 0, PmarketError::ZeroAmount);

    let market = &ctx.accounts.market;
    require!(market.state == MarketState::Open, PmarketError::InvalidMarketState);

    let clock = Clock::get()?;
    require!(clock.unix_timestamp < market.expiry, PmarketError::MarketExpired);

    // Transfer SOL to vault
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.bettor.to_account_info(),
                to: ctx.accounts.market_vault.to_account_info(),
            },
        ),
        amount,
    )?;

    let market = &mut ctx.accounts.market;
    let position = &mut ctx.accounts.position;

    // Initialize position fields if new
    if position.bump == 0 {
        position.market_id = market.id;
        position.user = ctx.accounts.bettor.key();
        position.yes_amount = 0;
        position.no_amount = 0;
        position.claimed = false;
        position.bump = ctx.bumps.position;
    }

    match outcome {
        0 => {
            // Yes
            market.yes_pool = market
                .yes_pool
                .checked_add(amount)
                .ok_or(PmarketError::ArithmeticOverflow)?;
            position.yes_amount = position
                .yes_amount
                .checked_add(amount)
                .ok_or(PmarketError::ArithmeticOverflow)?;
        }
        1 => {
            // No
            market.no_pool = market
                .no_pool
                .checked_add(amount)
                .ok_or(PmarketError::ArithmeticOverflow)?;
            position.no_amount = position
                .no_amount
                .checked_add(amount)
                .ok_or(PmarketError::ArithmeticOverflow)?;
        }
        _ => return Err(PmarketError::InvalidOutcome.into()),
    }

    msg!("Bet placed: {} lamports on outcome {}", amount, outcome);
    Ok(())
}
