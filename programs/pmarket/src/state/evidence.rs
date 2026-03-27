use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum EvidenceSide {
    Yes,
    No,
    Neutral,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum EvidenceStatus {
    Active,
    Challenged,
    Included,
    Excluded,
    Slashed,
}

#[account]
pub struct Evidence {
    pub id: u32,
    pub market_id: u64,
    pub parent_evidence_id: Option<u32>,
    pub author: Pubkey,
    pub side: EvidenceSide,
    pub content_uri: String,        // max 256
    pub content_hash: [u8; 32],
    pub bond_amount: u64,
    pub included_pool: u64,
    pub not_included_pool: u64,
    pub support_count: u32,
    pub challenge_count: u32,
    pub status: EvidenceStatus,
    pub created_at: i64,
    pub bump: u8,
    pub vault_bump: u8,
}

impl Evidence {
    // 8 + 4 + 8 + (1+4) parent + 32 + 1 + (4+256) + 32 + 8 + 8 + 8 + 4 + 4 + 1 + 8 + 1 + 1
    pub const SIZE: usize = 8 + 4 + 8 + 5 + 32 + 1 + (4 + 256) + 32 + 8 + 8 + 8 + 4 + 4 + 1 + 8 + 1 + 1; // 393
}
