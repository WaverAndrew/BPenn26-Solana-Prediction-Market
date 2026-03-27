use anchor_lang::prelude::*;
use crate::state::{Config, Market, MarketState, ResolutionBundle};
use crate::errors::PmarketError;

#[derive(Accounts)]
pub struct ResolveMarket<'info> {
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
        seeds = [b"market", market.id.to_le_bytes().as_ref()],
        bump = market.bump,
    )]
    pub market: Account<'info, Market>,

    #[account(
        seeds = [b"resolution", market.id.to_le_bytes().as_ref()],
        bump = resolution_bundle.bump,
    )]
    pub resolution_bundle: Account<'info, ResolutionBundle>,
}

pub fn handler(ctx: Context<ResolveMarket>) -> Result<()> {
    let market = &ctx.accounts.market;
    require!(
        market.state == MarketState::Resolving,
        PmarketError::InvalidMarketState
    );

    let bundle = &ctx.accounts.resolution_bundle;
    let market = &mut ctx.accounts.market;
    market.state = MarketState::Resolved;
    market.outcome = bundle.outcome;

    msg!("Market {} resolved with outcome {:?}", market.id, market.outcome);
    Ok(())
}
