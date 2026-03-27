use anchor_lang::prelude::*;
use crate::state::{Config, Market, MarketState, Outcome, Position};
use crate::errors::PmarketError;

#[derive(Accounts)]
pub struct SettlePosition<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        seeds = [b"config"],
        bump = config.bump,
    )]
    pub config: Account<'info, Config>,

    #[account(
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

    /// CHECK: Treasury PDA for fee collection
    #[account(
        mut,
        seeds = [b"treasury"],
        bump,
    )]
    pub treasury: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [b"position", market.id.to_le_bytes().as_ref(), user.key().as_ref()],
        bump = position.bump,
    )]
    pub position: Account<'info, Position>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<SettlePosition>) -> Result<()> {
    let market = &ctx.accounts.market;
    require!(
        market.state == MarketState::Resolved,
        PmarketError::MarketNotResolved
    );

    let position = &ctx.accounts.position;
    require!(!position.claimed, PmarketError::AlreadyClaimed);

    let total_pool = market
        .yes_pool
        .checked_add(market.no_pool)
        .ok_or(PmarketError::ArithmeticOverflow)?;

    let (user_winning_amount, winning_pool) = match market.outcome {
        Outcome::Yes => (position.yes_amount, market.yes_pool),
        Outcome::No => (position.no_amount, market.no_pool),
        Outcome::Invalid => {
            // Refund: return proportional share
            let user_total = position
                .yes_amount
                .checked_add(position.no_amount)
                .ok_or(PmarketError::ArithmeticOverflow)?;
            (user_total, total_pool)
        }
        Outcome::Undecided => return Err(PmarketError::MarketNotResolved.into()),
    };

    require!(user_winning_amount > 0, PmarketError::NoWinningPosition);

    let payout = if winning_pool == 0 {
        // Edge case: no one on the winning side — refund everyone
        position
            .yes_amount
            .checked_add(position.no_amount)
            .ok_or(PmarketError::ArithmeticOverflow)?
    } else {
        // Calculate fee
        let fee_bps = ctx.accounts.config.fee_bps as u128;
        let total_128 = total_pool as u128;
        let fee = total_128
            .checked_mul(fee_bps)
            .ok_or(PmarketError::ArithmeticOverflow)?
            .checked_div(10_000)
            .ok_or(PmarketError::ArithmeticOverflow)?;
        let distributable = total_128
            .checked_sub(fee)
            .ok_or(PmarketError::ArithmeticOverflow)?;

        let payout_128 = distributable
            .checked_mul(user_winning_amount as u128)
            .ok_or(PmarketError::ArithmeticOverflow)?
            .checked_div(winning_pool as u128)
            .ok_or(PmarketError::ArithmeticOverflow)?;

        // Transfer fee to treasury
        let fee_per_user = fee
            .checked_mul(user_winning_amount as u128)
            .ok_or(PmarketError::ArithmeticOverflow)?
            .checked_div(winning_pool as u128)
            .ok_or(PmarketError::ArithmeticOverflow)? as u64;

        if fee_per_user > 0 {
            let market_id_bytes = market.id.to_le_bytes();
            let vault_seeds: &[&[u8]] = &[
                b"vault",
                market_id_bytes.as_ref(),
                &[market.vault_bump],
            ];
            let signer_seeds = &[vault_seeds];

            **ctx.accounts.market_vault.to_account_info().try_borrow_mut_lamports()? -= fee_per_user;
            **ctx.accounts.treasury.to_account_info().try_borrow_mut_lamports()? += fee_per_user;
        }

        payout_128 as u64
    };

    // Transfer payout from vault to user
    if payout > 0 {
        **ctx.accounts.market_vault.to_account_info().try_borrow_mut_lamports()? -= payout;
        **ctx.accounts.user.to_account_info().try_borrow_mut_lamports()? += payout;
    }

    let position = &mut ctx.accounts.position;
    position.claimed = true;

    msg!("Position settled: {} lamports paid out", payout);
    Ok(())
}
