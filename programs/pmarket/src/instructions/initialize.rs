use anchor_lang::prelude::*;
use crate::state::Config;
use crate::errors::PmarketError;

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        init,
        payer = admin,
        space = Config::SIZE,
        seeds = [b"config"],
        bump,
    )]
    pub config: Account<'info, Config>,

    /// CHECK: Treasury PDA, just holds SOL
    #[account(
        seeds = [b"treasury"],
        bump,
    )]
    pub treasury: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<Initialize>, fee_bps: u16) -> Result<()> {
    require!(fee_bps <= 10_000, PmarketError::InvalidFeeBps);

    let config = &mut ctx.accounts.config;
    config.admin = ctx.accounts.admin.key();
    config.fee_recipient = ctx.accounts.admin.key();
    config.fee_bps = fee_bps;
    config.market_counter = 0;
    config.paused = false;
    config.bump = ctx.bumps.config;

    msg!("Protocol initialized with fee_bps={}", fee_bps);
    Ok(())
}
