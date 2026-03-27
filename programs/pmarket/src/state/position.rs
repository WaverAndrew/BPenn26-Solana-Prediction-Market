use anchor_lang::prelude::*;

#[account]
pub struct Position {
    pub market_id: u64,
    pub user: Pubkey,
    pub yes_amount: u64,
    pub no_amount: u64,
    pub claimed: bool,
    pub bump: u8,
}

impl Position {
    // 8 + 8 + 32 + 8 + 8 + 1 + 1 = 66
    pub const SIZE: usize = 8 + 8 + 32 + 8 + 8 + 1 + 1;
}
