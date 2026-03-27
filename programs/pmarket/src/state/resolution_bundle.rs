use anchor_lang::prelude::*;

#[account]
pub struct ResolutionBundle {
    pub market_id: u64,
    pub outcome: super::market::Outcome,
    pub included_evidence_ids: Vec<u32>, // max 32
    pub resolver: Pubkey,
    pub rationale_uri: String, // max 256
    pub resolved_at: i64,
    pub disputed: bool,
    pub bump: u8,
}

impl ResolutionBundle {
    // 8 + 8 + 1 + (4 + 32*4) + 32 + (4+256) + 8 + 1 + 1 = 451
    pub const SIZE: usize = 8 + 8 + 1 + (4 + 32 * 4) + 32 + (4 + 256) + 8 + 1 + 1;
}
