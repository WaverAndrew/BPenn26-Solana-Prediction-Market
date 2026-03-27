use anchor_lang::prelude::*;
use crate::state::{Config, Market, MarketState, Outcome, ResolutionBundle};
use crate::errors::PmarketError;

#[derive(Accounts)]
pub struct CreateResolutionBundle<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        seeds = [b"config"],
        bump = config.bump,
        constraint = config.admin == admin.key() @ PmarketError::Unauthorized,
    )]
    pub config: Account<'info, Config>,

    #[account(
        mut,
        seeds = [b"market", market.id.to_le_bytes().as_ref()],
        bump = market.bump,
    )]
    pub market: Account<'info, Market>,

    #[account(
        init,
        payer = admin,
        space = ResolutionBundle::SIZE,
        seeds = [b"resolution", market.id.to_le_bytes().as_ref()],
        bump,
    )]
    pub resolution_bundle: Account<'info, ResolutionBundle>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<CreateResolutionBundle>,
    outcome: u8,
    included_ids: Vec<u32>,
    rationale_uri: String,
) -> Result<()> {
    require!(included_ids.len() <= 32, PmarketError::BundleTooLarge);
    require!(rationale_uri.len() <= 256, PmarketError::StringTooLong);

    let market = &ctx.accounts.market;
    require!(
        market.state == MarketState::Open || market.state == MarketState::Closed,
        PmarketError::InvalidMarketState
    );

    // Validate all evidence IDs are within range
    for &id in &included_ids {
        require!(id < market.evidence_count, PmarketError::InvalidEvidenceId);
    }

    let resolution_outcome = match outcome {
        0 => Outcome::Yes,
        1 => Outcome::No,
        2 => Outcome::Invalid,
        _ => return Err(PmarketError::InvalidOutcome.into()),
    };

    let bundle = &mut ctx.accounts.resolution_bundle;
    bundle.market_id = market.id;
    bundle.outcome = resolution_outcome;
    bundle.included_evidence_ids = included_ids;
    bundle.resolver = ctx.accounts.admin.key();
    bundle.rationale_uri = rationale_uri;
    bundle.resolved_at = Clock::get()?.unix_timestamp;
    bundle.disputed = false;
    bundle.bump = ctx.bumps.resolution_bundle;

    let market = &mut ctx.accounts.market;
    market.state = MarketState::Resolving;
    market.resolution_bundle = ctx.accounts.resolution_bundle.key();

    msg!("Resolution bundle created for market {}", market.id);
    Ok(())
}
