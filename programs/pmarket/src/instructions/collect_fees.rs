use anchor_lang::prelude::*;
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

    /// CHECK: Treasury PDA
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

    **ctx.accounts.treasury.to_account_info().try_borrow_mut_lamports()? -= drainable;
    **ctx.accounts.fee_recipient.to_account_info().try_borrow_mut_lamports()? += drainable;

    msg!("Collected {} lamports in fees", drainable);
    Ok(())
}
