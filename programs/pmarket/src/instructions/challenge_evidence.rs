use anchor_lang::prelude::*;
use crate::state::{Config, Market, MarketState, Evidence, EvidenceStatus};
use crate::errors::PmarketError;

pub const CHALLENGE_THRESHOLD: u32 = 5;

#[derive(Accounts)]
pub struct ChallengeEvidence<'info> {
    #[account(mut)]
    pub challenger: Signer<'info>,

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

    #[account(
        mut,
        seeds = [
            b"evidence",
            market.id.to_le_bytes().as_ref(),
            evidence.id.to_le_bytes().as_ref(),
        ],
        bump = evidence.bump,
    )]
    pub evidence: Account<'info, Evidence>,
}

pub fn handler(ctx: Context<ChallengeEvidence>) -> Result<()> {
    require!(!ctx.accounts.config.paused, PmarketError::ProtocolPaused);

    let market = &ctx.accounts.market;
    require!(
        market.state == MarketState::Open || market.state == MarketState::Closed,
        PmarketError::InvalidMarketState
    );

    let evidence = &mut ctx.accounts.evidence;
    require!(
        evidence.status == EvidenceStatus::Active || evidence.status == EvidenceStatus::Challenged,
        PmarketError::EvidenceNotActive
    );

    evidence.challenge_count = evidence
        .challenge_count
        .checked_add(1)
        .ok_or(PmarketError::ArithmeticOverflow)?;

    if evidence.challenge_count >= CHALLENGE_THRESHOLD {
        evidence.status = EvidenceStatus::Challenged;
    }

    msg!(
        "Evidence {} challenged ({}/{})",
        evidence.id,
        evidence.challenge_count,
        CHALLENGE_THRESHOLD,
    );
    Ok(())
}
