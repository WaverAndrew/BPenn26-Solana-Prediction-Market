use anchor_lang::prelude::*;
use anchor_lang::system_program;
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

    /// CHECK: Evidence vault PDA — signs via seeds for CPI transfer
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

    if bond > 0 {
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
                    to: ctx.accounts.treasury.to_account_info(),
                },
                &[vault_seeds],
            ),
            bond,
        )?;
    }

    let evidence = &mut ctx.accounts.evidence;
    evidence.status = EvidenceStatus::Slashed;

    msg!("Evidence {} bond slashed: {} lamports", evidence.id, bond);
    Ok(())
}
