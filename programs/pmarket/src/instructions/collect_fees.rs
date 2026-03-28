use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::Config;
use crate::errors::PmarketError;

#[derive(Accounts)]
pub struct CollectFees<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        seeds = [b"config"],
        bump = config.bump,
        constraint = config.admin == admin.key() @ PmarketError::Unauthorized,
    )]
    pub config: Account<'info, Config>,

    /// CHECK: Fee recipient
    #[account(
        mut,
        constraint = fee_recipient.key() == config.fee_recipient @ PmarketError::Unauthorized,
    )]
    pub fee_recipient: UncheckedAccount<'info>,

    /// CHECK: Treasury PDA — signs via seeds for CPI transfer out
    #[account(
        mut,
        seeds = [b"treasury"],
        bump,
    )]
    pub treasury: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CollectFees>) -> Result<()> {
    let treasury_lamports = ctx.accounts.treasury.lamports();
    let rent = Rent::get()?;
    let min_balance = rent.minimum_balance(0);
    let drainable = treasury_lamports.saturating_sub(min_balance);

    require!(drainable > 0, PmarketError::InsufficientFunds);

    let treasury_bump = ctx.bumps.treasury;
    let treasury_seeds: &[&[u8]] = &[b"treasury", &[treasury_bump]];

    system_program::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.treasury.to_account_info(),
                to: ctx.accounts.fee_recipient.to_account_info(),
            },
            &[treasury_seeds],
        ),
        drainable,
    )?;

    msg!("Collected {} lamports in fees", drainable);
    Ok(())
}
