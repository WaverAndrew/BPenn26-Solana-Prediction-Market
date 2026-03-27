use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::{Config, Market, MarketState, Evidence, EvidenceSide, EvidenceStatus};
use crate::errors::PmarketError;

pub const MIN_BOND: u64 = 10_000_000; // 0.01 SOL

#[derive(Accounts)]
#[instruction(side: u8, content_uri: String, content_hash: [u8; 32], parent_id: Option<u32>, bond: u64)]
pub struct SubmitEvidence<'info> {
    #[account(mut)]
    pub author: Signer<'info>,

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

    #[account(
        init,
        payer = author,
        space = Evidence::SIZE,
        seeds = [
            b"evidence",
            market.id.to_le_bytes().as_ref(),
            market.evidence_count.to_le_bytes().as_ref(),
        ],
        bump,
    )]
    pub evidence: Account<'info, Evidence>,

    /// CHECK: Evidence vault PDA
    #[account(
        mut,
        seeds = [
            b"evidence_vault",
            market.id.to_le_bytes().as_ref(),
            market.evidence_count.to_le_bytes().as_ref(),
        ],
        bump,
    )]
    pub evidence_vault: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<SubmitEvidence>,
    side: u8,
    content_uri: String,
    content_hash: [u8; 32],
    parent_id: Option<u32>,
    bond: u64,
) -> Result<()> {
    require!(!ctx.accounts.config.paused, PmarketError::ProtocolPaused);
    require!(content_uri.len() <= 256, PmarketError::StringTooLong);
    require!(bond >= MIN_BOND, PmarketError::BondTooLow);

    let market = &ctx.accounts.market;
    require!(
        market.state == MarketState::Open || market.state == MarketState::Closed,
        PmarketError::InvalidMarketState
    );

    let evidence_side = match side {
        0 => EvidenceSide::Yes,
        1 => EvidenceSide::No,
        2 => EvidenceSide::Neutral,
        _ => return Err(PmarketError::InvalidOutcome.into()),
    };

    // Transfer bond to evidence vault
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.author.to_account_info(),
                to: ctx.accounts.evidence_vault.to_account_info(),
            },
        ),
        bond,
    )?;

    let evidence = &mut ctx.accounts.evidence;
    let evidence_id = ctx.accounts.market.evidence_count;

    evidence.id = evidence_id;
    evidence.market_id = ctx.accounts.market.id;
    evidence.parent_evidence_id = parent_id;
    evidence.author = ctx.accounts.author.key();
    evidence.side = evidence_side;
    evidence.content_uri = content_uri;
    evidence.content_hash = content_hash;
    evidence.bond_amount = bond;
    evidence.included_pool = 0;
    evidence.not_included_pool = 0;
    evidence.support_count = 0;
    evidence.challenge_count = 0;
    evidence.status = EvidenceStatus::Active;
    evidence.created_at = Clock::get()?.unix_timestamp;
    evidence.bump = ctx.bumps.evidence;
    evidence.vault_bump = ctx.bumps.evidence_vault;

    let market = &mut ctx.accounts.market;
    market.evidence_count = market
        .evidence_count
        .checked_add(1)
        .ok_or(PmarketError::ArithmeticOverflow)?;

    msg!("Evidence {} submitted for market {}", evidence_id, market.id);
    Ok(())
}
