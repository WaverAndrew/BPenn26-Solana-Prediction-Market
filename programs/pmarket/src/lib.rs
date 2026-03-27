use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod pmarket {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, fee_bps: u16) -> Result<()> {
        instructions::initialize::handler(ctx, fee_bps)
    }

    pub fn create_market(
        ctx: Context<CreateMarket>,
        claim_uri: String,
        category: u8,
        expiry: i64,
        metadata_uri: String,
    ) -> Result<()> {
        instructions::create_market::handler(ctx, claim_uri, category, expiry, metadata_uri)
    }

    pub fn place_bet(ctx: Context<PlaceBet>, outcome: u8, amount: u64) -> Result<()> {
        instructions::place_bet::handler(ctx, outcome, amount)
    }

    pub fn submit_evidence(
        ctx: Context<SubmitEvidence>,
        side: u8,
        content_uri: String,
        content_hash: [u8; 32],
        parent_id: Option<u32>,
        bond: u64,
    ) -> Result<()> {
        instructions::submit_evidence::handler(ctx, side, content_uri, content_hash, parent_id, bond)
    }

    pub fn stake_evidence(ctx: Context<StakeEvidence>, side: u8, amount: u64) -> Result<()> {
        instructions::stake_evidence::handler(ctx, side, amount)
    }

    pub fn challenge_evidence(ctx: Context<ChallengeEvidence>) -> Result<()> {
        instructions::challenge_evidence::handler(ctx)
    }

    pub fn create_resolution_bundle(
        ctx: Context<CreateResolutionBundle>,
        outcome: u8,
        included_ids: Vec<u32>,
        rationale_uri: String,
    ) -> Result<()> {
        instructions::create_resolution_bundle::handler(ctx, outcome, included_ids, rationale_uri)
    }

    pub fn resolve_market(ctx: Context<ResolveMarket>) -> Result<()> {
        instructions::resolve_market::handler(ctx)
    }

    pub fn settle_position(ctx: Context<SettlePosition>) -> Result<()> {
        instructions::settle_position::handler(ctx)
    }

    pub fn settle_evidence_stake(ctx: Context<SettleEvidenceStake>) -> Result<()> {
        instructions::settle_evidence_stake::handler(ctx)
    }

    pub fn initialize_user_profile(ctx: Context<InitializeUserProfile>) -> Result<()> {
        instructions::initialize_user_profile::handler(ctx)
    }

    pub fn update_karma(
        ctx: Context<UpdateKarma>,
        user_key: Pubkey,
        karma_type: u8,
        delta: i64,
    ) -> Result<()> {
        instructions::update_karma::handler(ctx, user_key, karma_type, delta)
    }

    pub fn slash_bond(ctx: Context<SlashBond>) -> Result<()> {
        instructions::slash_bond::handler(ctx)
    }

    pub fn collect_fees(ctx: Context<CollectFees>) -> Result<()> {
        instructions::collect_fees::handler(ctx)
    }
}
