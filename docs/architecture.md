# Architecture

## Overview

Social prediction market on Solana where markets are created from posts, comments serve as evidence, and users stake on whether evidence will be included in the final resolution bundle.

## Stack

- **Smart Contracts**: Anchor (Rust) on Solana
- **Frontend**: Next.js 14, Tailwind CSS, Solana Wallet Adapter
- **Indexer**: TypeScript, polls on-chain accounts → PostgreSQL via Prisma
- **API**: Express REST API serving indexed data
- **LLM Judge**: Claude-powered evidence analysis service

## On-Chain Program

14 instructions across 3 domains:

### Core Market
- `initialize` — protocol config + treasury
- `create_market` — new prediction market with claim URI
- `place_bet` — parimutuel YES/NO betting
- `create_resolution_bundle` — admin creates resolution with included evidence
- `resolve_market` — finalize market outcome
- `settle_position` — claim winnings from market vault

### Evidence System
- `submit_evidence` — post evidence with bond
- `stake_evidence` — bet on evidence inclusion/exclusion
- `challenge_evidence` — flag low-quality evidence
- `settle_evidence_stake` — claim winnings from evidence mini-market
- `slash_bond` — admin slashes bad evidence bond to treasury

### User System
- `initialize_user_profile` — create on-chain profile
- `update_karma` — admin updates karma scores
- `collect_fees` — drain treasury to fee recipient

## Economic Model

**Parimutuel pools**: `payout = distributable * user_amount / winning_pool`

- Fee deducted from total pool before distribution
- Evidence mini-markets use the same formula over included/not-included pools
- Evidence authors get bond back if included, slashed if fraudulent

## Data Flow

1. Users interact via frontend → send Solana transactions
2. Indexer polls `getProgramAccounts` → upserts to PostgreSQL
3. API serves indexed data to frontend
4. LLM Judge analyzes evidence → provides recommendations to admin
5. Admin publishes resolution bundle on-chain → triggers settlement
