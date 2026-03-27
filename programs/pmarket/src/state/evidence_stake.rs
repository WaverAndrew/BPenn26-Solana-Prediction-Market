use anchor_lang::prelude::*;

#[account]
pub struct EvidenceStake {
    pub market_id: u64,
    pub evidence_id: u32,
    pub user: Pubkey,
    pub included_amount: u64,
    pub not_included_amount: u64,
    pub claimed: bool,
    pub bump: u8,
}

impl EvidenceStake {
    // 8 + 8 + 4 + 32 + 8 + 8 + 1 + 1 = 70
    pub const SIZE: usize = 8 + 8 + 4 + 32 + 8 + 8 + 1 + 1;
}
