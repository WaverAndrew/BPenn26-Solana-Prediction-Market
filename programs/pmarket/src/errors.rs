use anchor_lang::prelude::*;

#[error_code]
pub enum PmarketError {
    #[msg("Unauthorized access")]
    Unauthorized,

    #[msg("Market is not in the correct state for this operation")]
    InvalidMarketState,

    #[msg("Market has expired")]
    MarketExpired,

    #[msg("Market has not expired yet")]
    MarketNotExpired,

    #[msg("Invalid outcome")]
    InvalidOutcome,

    #[msg("Amount must be greater than zero")]
    ZeroAmount,

    #[msg("Insufficient funds")]
    InsufficientFunds,

    #[msg("Position already claimed")]
    AlreadyClaimed,

    #[msg("No winning position to claim")]
    NoWinningPosition,

    #[msg("Invalid fee basis points (must be <= 10000)")]
    InvalidFeeBps,

    #[msg("Protocol is paused")]
    ProtocolPaused,

    #[msg("Evidence bond too low")]
    BondTooLow,

    #[msg("Evidence already challenged beyond threshold")]
    AlreadyChallenged,

    #[msg("Evidence is not active")]
    EvidenceNotActive,

    #[msg("Evidence has already been slashed")]
    EvidenceAlreadySlashed,

    #[msg("Resolution bundle too large (max 32 evidence IDs)")]
    BundleTooLarge,

    #[msg("Invalid evidence ID in resolution bundle")]
    InvalidEvidenceId,

    #[msg("Expiry must be in the future")]
    ExpiryInPast,

    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,

    #[msg("Winning pool is zero — refund mode")]
    ZeroWinningPool,

    #[msg("Evidence stake already claimed")]
    EvidenceStakeAlreadyClaimed,

    #[msg("Market not resolved")]
    MarketNotResolved,

    #[msg("String too long")]
    StringTooLong,

    #[msg("Parent evidence not found")]
    ParentEvidenceNotFound,
}
