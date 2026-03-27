use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum MarketState {
    Open,
    Closed,
    Resolving,
    Resolved,
    Disputed,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum Outcome {
    Undecided,
    Yes,
    No,
    Invalid,
}

#[account]
pub struct Market {
    pub id: u64,
    pub creator: Pubkey,
    pub claim_uri: String,      // max 256
    pub category: u8,
    pub expiry: i64,
    pub state: MarketState,
    pub outcome: Outcome,
    pub yes_pool: u64,
    pub no_pool: u64,
    pub evidence_count: u32,
    pub resolution_bundle: Pubkey,
    pub metadata_uri: String,   // max 128
    pub created_at: i64,
    pub bump: u8,
    pub vault_bump: u8,
}

impl Market {
    // 8 discriminator + 8 id + 32 creator + (4+256) claim_uri + 1 category + 8 expiry
    // + 1 state + 1 outcome + 8 yes_pool + 8 no_pool + 4 evidence_count + 32 resolution_bundle
    // + (4+128) metadata_uri + 8 created_at + 1 bump + 1 vault_bump
    pub const SIZE: usize = 8 + 8 + 32 + (4 + 256) + 1 + 8 + 1 + 1 + 8 + 8 + 4 + 32 + (4 + 128) + 8 + 1 + 1; // 513
}
