use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::{Config, Market, MarketState, Evidence, EvidenceStatus, EvidenceStake};
use crate::errors::PmarketError;

#[derive(Accounts)]
pub struct StakeEvidence<'info> {
    #[account(mut)]
    pub staker: Signer<'info>,

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

    /// CHECK: Evidence vault PDA
    #[account(
        mut,
        seeds = [
            b"evidence_vault",
            market.id.to_le_bytes().as_ref(),
            evidence.id.to_le_bytes().as_ref(),
        ],
        bump = evidence.vault_bump,
    )]
    pub evidence_vault: UncheckedAccount<'info>,

    #[account(
        init_if_needed,
        payer = staker,
        space = EvidenceStake::SIZE,
        seeds = [
            b"estake",
            market.id.to_le_bytes().as_ref(),
            evidence.id.to_le_bytes().as_ref(),
            staker.key().as_ref(),
        ],
        bump,
    )]
    pub evidence_stake: Account<'info, EvidenceStake>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<StakeEvidence>, side: u8, amount: u64) -> Result<()> {
    require!(!ctx.accounts.config.paused, PmarketError::ProtocolPaused);
    require!(amount > 0, PmarketError::ZeroAmount);

    let market = &ctx.accounts.market;
    require!(
        market.state == MarketState::Open || market.state == MarketState::Closed,
        PmarketError::InvalidMarketState
    );

    let evidence = &ctx.accounts.evidence;
    require!(
        evidence.status == EvidenceStatus::Active || evidence.status == EvidenceStatus::Challenged,
        PmarketError::EvidenceNotActive
    );

    // Transfer SOL to evidence vault
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.staker.to_account_info(),
                to: ctx.accounts.evidence_vault.to_account_info(),
            },
        ),
        amount,
    )?;

    let evidence = &mut ctx.accounts.evidence;
    let stake = &mut ctx.accounts.evidence_stake;

    // Initialize if newly created
    if stake.user == Pubkey::default() {
        stake.market_id = market.id;
        stake.evidence_id = evidence.id;
        stake.user = ctx.accounts.staker.key();
        stake.included_amount = 0;
        stake.not_included_amount = 0;
        stake.claimed = false;
        stake.bump = ctx.bumps.evidence_stake;
    }

    match side {
        0 => {
            // Included
            evidence.included_pool = evidence
                .included_pool
                .checked_add(amount)
                .ok_or(PmarketError::ArithmeticOverflow)?;
            stake.included_amount = stake
                .included_amount
                .checked_add(amount)
                .ok_or(PmarketError::ArithmeticOverflow)?;
            evidence.support_count = evidence
                .support_count
                .checked_add(1)
                .ok_or(PmarketError::ArithmeticOverflow)?;
        }
        1 => {
            // Not Included
            evidence.not_included_pool = evidence
                .not_included_pool
                .checked_add(amount)
                .ok_or(PmarketError::ArithmeticOverflow)?;
            stake.not_included_amount = stake
                .not_included_amount
                .checked_add(amount)
                .ok_or(PmarketError::ArithmeticOverflow)?;
        }
        _ => return Err(PmarketError::InvalidOutcome.into()),
    }

    msg!("Evidence {} staked: {} lamports on side {}", evidence.id, amount, side);
    Ok(())
}
