use anchor_lang::prelude::*;

#[account]
pub struct Config {
    pub admin: Pubkey,
    pub fee_recipient: Pubkey,
    pub fee_bps: u16,
    pub market_counter: u64,
    pub paused: bool,
    pub bump: u8,
}

impl Config {
    pub const SIZE: usize = 8 + 32 + 32 + 2 + 8 + 1 + 1; // 84
}
