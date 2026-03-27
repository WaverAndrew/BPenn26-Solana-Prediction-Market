use anchor_lang::prelude::*;

#[account]
pub struct UserProfile {
    pub authority: Pubkey,
    pub forecast_karma: i64,
    pub evidence_karma: i64,
    pub reviewer_karma: i64,
    pub challenge_karma: i64,
    pub penalties: u32,
    pub markets_created: u32,
    pub bets_placed: u32,
    pub evidence_submitted: u32,
    pub created_at: i64,
    pub bump: u8,
}

impl UserProfile {
    // 8 + 32 + 8*4 + 4*4 + 8 + 1 = 97
    pub const SIZE: usize = 8 + 32 + 8 + 8 + 8 + 8 + 4 + 4 + 4 + 4 + 8 + 1;
}
