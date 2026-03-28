use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::{Config, Market, MarketState, Evidence, EvidenceStake, ResolutionBundle};
use crate::errors::PmarketError;

#[derive(Accounts)]
pub struct SettleEvidenceStake<'info> {
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

    #[account(
        seeds = [
            b"evidence",
            market.id.to_le_bytes().as_ref(),
            evidence.id.to_le_bytes().as_ref(),
        ],
        bump = evidence.bump,
    )]
    pub evidence: Account<'info, Evidence>,

    /// CHECK: Evidence vault PDA — signs via seeds for CPI transfer out
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
        seeds = [b"resolution", market.id.to_le_bytes().as_ref()],
        bump = resolution_bundle.bump,
    )]
    pub resolution_bundle: Account<'info, ResolutionBundle>,

    #[account(
        mut,
        seeds = [
            b"estake",
            market.id.to_le_bytes().as_ref(),
            evidence.id.to_le_bytes().as_ref(),
            user.key().as_ref(),
        ],
        bump = evidence_stake.bump,
    )]
    pub evidence_stake: Account<'info, EvidenceStake>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<SettleEvidenceStake>) -> Result<()> {
    let market = &ctx.accounts.market;
    require!(
        market.state == MarketState::Resolved,
        PmarketError::MarketNotResolved
    );

    let stake = &ctx.accounts.evidence_stake;
    require!(!stake.claimed, PmarketError::EvidenceStakeAlreadyClaimed);

    let evidence = &ctx.accounts.evidence;
    let bundle = &ctx.accounts.resolution_bundle;

    let is_included = bundle.included_evidence_ids.contains(&evidence.id);

    let total_pool = evidence
        .included_pool
        .checked_add(evidence.not_included_pool)
        .ok_or(PmarketError::ArithmeticOverflow)?;

    let (user_winning_amount, winning_pool) = if is_included {
        (stake.included_amount, evidence.included_pool)
    } else {
        (stake.not_included_amount, evidence.not_included_pool)
    };

    require!(user_winning_amount > 0, PmarketError::NoWinningPosition);

    let payout = if winning_pool == 0 {
        stake
            .included_amount
            .checked_add(stake.not_included_amount)
            .ok_or(PmarketError::ArithmeticOverflow)?
    } else {
        let total_128 = total_pool as u128;
        let payout_128 = total_128
            .checked_mul(user_winning_amount as u128)
            .ok_or(PmarketError::ArithmeticOverflow)?
            .checked_div(winning_pool as u128)
            .ok_or(PmarketError::ArithmeticOverflow)?;
        payout_128 as u64
    };

    // Transfer payout from evidence vault to user via CPI
    if payout > 0 {
        let market_id_bytes = ctx.accounts.market.id.to_le_bytes();
        let evidence_id_bytes = ctx.accounts.evidence.id.to_le_bytes();
        let vault_bump = ctx.accounts.evidence.vault_bump;
        let vault_seeds: &[&[u8]] = &[
            b"evidence_vault",
            market_id_bytes.as_ref(),
            evidence_id_bytes.as_ref(),
            &[vault_bump],
        ];

        system_program::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.evidence_vault.to_account_info(),
                    to: ctx.accounts.user.to_account_info(),
                },
                &[vault_seeds],
            ),
            payout,
        )?;
    }

    let stake = &mut ctx.accounts.evidence_stake;
    stake.claimed = true;

    msg!("Evidence stake settled: {} lamports paid out", payout);
    Ok(())
}
