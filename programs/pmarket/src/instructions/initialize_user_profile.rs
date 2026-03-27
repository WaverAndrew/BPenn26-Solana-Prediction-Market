use anchor_lang::prelude::*;
use crate::state::UserProfile;

#[derive(Accounts)]
pub struct InitializeUserProfile<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        init,
        payer = user,
        space = UserProfile::SIZE,
        seeds = [b"profile", user.key().as_ref()],
        bump,
    )]
    pub profile: Account<'info, UserProfile>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitializeUserProfile>) -> Result<()> {
    let profile = &mut ctx.accounts.profile;
    profile.authority = ctx.accounts.user.key();
    profile.forecast_karma = 0;
    profile.evidence_karma = 0;
    profile.reviewer_karma = 0;
    profile.challenge_karma = 0;
    profile.penalties = 0;
    profile.markets_created = 0;
    profile.bets_placed = 0;
    profile.evidence_submitted = 0;
    profile.created_at = Clock::get()?.unix_timestamp;
    profile.bump = ctx.bumps.profile;

    msg!("User profile initialized");
    Ok(())
}
