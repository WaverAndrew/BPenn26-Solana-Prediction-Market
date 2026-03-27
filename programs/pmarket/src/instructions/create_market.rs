use anchor_lang::prelude::*;
use crate::state::{Config, Market, MarketState, Outcome};
use crate::errors::PmarketError;

#[derive(Accounts)]
pub struct CreateMarket<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump,
    )]
    pub config: Account<'info, Config>,

    #[account(
        init,
        payer = creator,
        space = Market::SIZE,
        seeds = [b"market", config.market_counter.to_le_bytes().as_ref()],
        bump,
    )]
    pub market: Account<'info, Market>,

    /// CHECK: Market vault PDA, just holds SOL
    #[account(
        seeds = [b"vault", config.market_counter.to_le_bytes().as_ref()],
        bump,
    )]
    pub market_vault: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<CreateMarket>,
    claim_uri: String,
    category: u8,
    expiry: i64,
    metadata_uri: String,
) -> Result<()> {
    require!(!ctx.accounts.config.paused, PmarketError::ProtocolPaused);
    require!(claim_uri.len() <= 256, PmarketError::StringTooLong);
    require!(metadata_uri.len() <= 128, PmarketError::StringTooLong);

    let clock = Clock::get()?;
    require!(expiry > clock.unix_timestamp, PmarketError::ExpiryInPast);

    let config = &mut ctx.accounts.config;
    let market_id = config.market_counter;

    let market = &mut ctx.accounts.market;
    market.id = market_id;
    market.creator = ctx.accounts.creator.key();
    market.claim_uri = claim_uri;
    market.category = category;
    market.expiry = expiry;
    market.state = MarketState::Open;
    market.outcome = Outcome::Undecided;
    market.yes_pool = 0;
    market.no_pool = 0;
    market.evidence_count = 0;
    market.resolution_bundle = Pubkey::default();
    market.metadata_uri = metadata_uri;
    market.created_at = clock.unix_timestamp;
    market.bump = ctx.bumps.market;
    market.vault_bump = ctx.bumps.market_vault;

    config.market_counter = config
        .market_counter
        .checked_add(1)
        .ok_or(PmarketError::ArithmeticOverflow)?;

    msg!("Market {} created", market_id);
    Ok(())
}
