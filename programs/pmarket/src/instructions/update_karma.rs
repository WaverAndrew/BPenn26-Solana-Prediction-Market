use anchor_lang::prelude::*;
use crate::state::{Config, UserProfile};
use crate::errors::PmarketError;

#[derive(Accounts)]
#[instruction(user_key: Pubkey)]
pub struct UpdateKarma<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        seeds = [b"config"],
        bump = config.bump,
        constraint = config.admin == admin.key() @ PmarketError::Unauthorized,
    )]
    pub config: Account<'info, Config>,

    #[account(
        mut,
        seeds = [b"profile", user_key.as_ref()],
        bump = profile.bump,
    )]
    pub profile: Account<'info, UserProfile>,
}

pub fn handler(
    ctx: Context<UpdateKarma>,
    _user_key: Pubkey,
    karma_type: u8,
    delta: i64,
) -> Result<()> {
    let profile = &mut ctx.accounts.profile;

    match karma_type {
        0 => {
            profile.forecast_karma = profile
                .forecast_karma
                .checked_add(delta)
                .ok_or(PmarketError::ArithmeticOverflow)?;
        }
        1 => {
            profile.evidence_karma = profile
                .evidence_karma
                .checked_add(delta)
                .ok_or(PmarketError::ArithmeticOverflow)?;
        }
        2 => {
            profile.reviewer_karma = profile
                .reviewer_karma
                .checked_add(delta)
                .ok_or(PmarketError::ArithmeticOverflow)?;
        }
        3 => {
            profile.challenge_karma = profile
                .challenge_karma
                .checked_add(delta)
                .ok_or(PmarketError::ArithmeticOverflow)?;
        }
        _ => return Err(PmarketError::InvalidOutcome.into()),
    }

    msg!("Karma updated: type={}, delta={}", karma_type, delta);
    Ok(())
}
