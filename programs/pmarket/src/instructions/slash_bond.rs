use anchor_lang::prelude::*;
use crate::state::{Config, Market, Evidence, EvidenceStatus};
use crate::errors::PmarketError;

#[derive(Accounts)]
pub struct SlashBond<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        seeds = [b"config"],
        bump = config.bump,
        constraint = config.admin == admin.key() @ PmarketError::Unauthorized,
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

    /// CHECK: Treasury PDA
    #[account(
        mut,
        seeds = [b"treasury"],
        bump,
    )]
    pub treasury: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<SlashBond>) -> Result<()> {
    let evidence = &ctx.accounts.evidence;
    require!(
        evidence.status != EvidenceStatus::Slashed,
        PmarketError::EvidenceAlreadySlashed
    );

    let bond = evidence.bond_amount;

    // Transfer bond from evidence vault to treasury
    if bond > 0 {
        **ctx.accounts.evidence_vault.to_account_info().try_borrow_mut_lamports()? -= bond;
        **ctx.accounts.treasury.to_account_info().try_borrow_mut_lamports()? += bond;
    }

    let evidence = &mut ctx.accounts.evidence;
    evidence.status = EvidenceStatus::Slashed;

    msg!("Evidence {} bond slashed: {} lamports", evidence.id, bond);
    Ok(())
}
