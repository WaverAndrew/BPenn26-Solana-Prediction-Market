# PMarket — Social Prediction Market on Solana

> A prediction market where **every claim is a market**, every comment is evidence, and collective intelligence drives resolution.

PMarket reimagines prediction markets as a social layer: markets emerge from posts and claims, users submit structured evidence with economic bonds, and a dual-layer staking system lets the crowd vote on which evidence gets included in the final resolution. An LLM judge assists human resolvers with analysis, but on-chain governance remains the source of truth.

---

## Table of Contents

1. [Market Mechanism Design](#1-market-mechanism-design)
2. [Innovation](#2-innovation)
3. [Architecture Overview](#3-architecture-overview)
4. [Smart Contract Design](#4-smart-contract-design)
5. [Economic Model](#5-economic-model)
6. [Resolution Strategy](#6-resolution-strategy)
7. [Tech Stack](#7-tech-stack)
8. [Repo Structure](#8-repo-structure)
9. [Setup Instructions](#9-setup-instructions)
10. [Deployment (Devnet)](#10-deployment-devnet)
11. [API Reference](#11-api-reference)
12. [Judgment Criteria Mapping](#12-judgment-criteria-mapping)

---

## 1. Market Mechanism Design

### Root Market — Parimutuel Binary Pools

Each market is a **binary parimutuel pool** over a natural-language claim (e.g. *"The Fed will cut rates in Q3 2025"*).

Users place SOL bets into a YES pool or NO pool. When the market resolves:

```
total        = yes_pool + no_pool
fee          = total × fee_bps / 10,000
distributable = total − fee
payout_i     = distributable × user_stake_i / winning_pool
```

All arithmetic uses `u128` intermediates to prevent overflow. Fees accumulate in a PDA treasury and are drained by admin to a configurable fee recipient.

**Why parimutuel instead of AMM/CLOB?**

| Property | Parimutuel | AMM (CPPM) | CLOB |
|---|---|---|---|
| Implementation complexity | Low | Medium | High |
| No liquidity bootstrap needed | ✅ | ❌ | ❌ |
| Correct expected value math | ✅ | ✅ | ✅ |
| Slippage for large bets | None | Yes | Yes |
| Suitable for binary outcomes | ✅ | ✅ | ✅ |

For a hackathon MVP targeting accessible UX, parimutuel is the right tradeoff.

### Evidence Layer — The Novel Contribution

Every market has an attached **evidence thread**. Users post evidence items (think threaded comments) with:

- A **side** (supports YES / supports NO / neutral)
- A **content hash** (SHA-256 of the text, stored on IPFS for verifiability)
- A **bond** (minimum 0.01 SOL) that the author puts at risk

Each evidence item is itself a **mini prediction market** — users stake on whether that piece of evidence will be *included* in the final resolution bundle. This creates a second-order market: *"Is this evidence credible enough to matter?"*

```
evidence_payout_i = total_evidence_pool × user_stake_i / winning_side_pool
```

The resolution bundle published on-chain specifies exactly which evidence IDs are included. Stakers who predicted correctly win the losing side's funds.

### Karma System

On-chain `UserProfile` PDAs accumulate karma across four axes:

| Axis | Earned by |
|---|---|
| `forecast_karma` | Accurate market bets |
| `evidence_karma` | Evidence included in bundles |
| `reviewer_karma` | Evidence stakes that were correct |
| `challenge_karma` | Successful challenges to bad evidence |

Karma is computed off-chain after settlement and written via admin-privileged `update_karma` instruction. This keeps on-chain logic simple while enabling rich reputation signals.

---

## 2. Innovation

### What's New

**Dual-layer staking.** Most prediction markets have one pool per market. PMarket has *N+1* pools — one for the root binary outcome, and one per evidence item. This means the crowd continuously prices the relevance of information, not just the final outcome. Accuracy is rewarded at two levels.

**Evidence as first-class on-chain objects.** Each `Evidence` PDA stores:
- A content hash (integrity-verifiable against IPFS)
- A bond (author has skin in the game)
- Inclusion/exclusion staking pools
- Challenge count + status (Active → Challenged → Included/Excluded/Slashed)
- Parent evidence ID (enabling threaded discourse)

**LLM-assisted human resolution.** The `llm-judge` service uses Claude to score each evidence item across credibility, relevance, novelty, and direction. These scores are advisory — a human admin publishes the final `ResolutionBundle` on-chain. The LLM accelerates resolution without removing accountability.

**Social graph as price discovery.** The threaded evidence structure means the information surface is a tree, not a flat order book. Parent-child relationships let users directly rebut or support specific claims, creating a structured argument graph that the resolver (and LLM) can traverse.

### Beyond Standard Binary Markets

| Feature | Standard Prediction Market | PMarket |
|---|---|---|
| Outcome | Binary | Binary + evidence inclusion |
| Information aggregation | Prices only | Prices + ranked evidence corpus |
| Author accountability | None | Bonded evidence |
| Dispute mechanism | Oracle | Challenge + LLM + admin |
| On-chain user identity | None | Karma-weighted profiles |
| Content verifiability | None | SHA-256 hash on-chain, content on IPFS |

---

## 3. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js 14)                │
│  Feed · Market Detail · Create · Profile · Admin            │
└──────────────┬──────────────────────────┬───────────────────┘
               │ REST API                 │ RPC (Solana)
               ▼                          ▼
┌──────────────────────┐    ┌─────────────────────────────┐
│   API Service        │    │   Solana Devnet / Localnet  │
│   (Express)          │    │                             │
│   /api/markets       │    │   Program: pmarket          │
│   /api/feed          │    │   14 instructions           │
│   /api/users         │    │   10 PDA types              │
│   /api/admin         │    │   SOL vaults per market     │
└──────────┬───────────┘    └─────────────┬───────────────┘
           │                              │
           ▼                              │
┌──────────────────────┐                  │
│   PostgreSQL         │◄─── Indexer ─────┘
│   (Prisma)           │     (polls getProgramAccounts)
└──────────────────────┘
           │
           ▼
┌──────────────────────┐
│   LLM Judge          │
│   (Express + Claude) │
│   /judge/analyze     │
│   /judge/recommend   │
└──────────────────────┘
```

**Data flow:**
1. User connects Phantom wallet → signs transactions via frontend
2. Transactions land on Solana → state mutates on-chain
3. Indexer polls `getProgramAccounts` every 5s → deserializes + upserts to PostgreSQL
4. API reads PostgreSQL → serves paginated REST responses to frontend
5. Admin triggers LLM Judge → Claude analyzes evidence → admin reviews scores → publishes `ResolutionBundle` on-chain

---

## 4. Smart Contract Design

### Program ID

```
Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS
```

### Account PDAs

| Account | Seeds | Purpose |
|---|---|---|
| `Config` | `["config"]` | Protocol admin, fee bps, market counter |
| `Market` | `["market", market_id: u64]` | Claim, pools, state, outcome |
| `MarketVault` | `["vault", market_id: u64]` | SOL escrow for bets |
| `Evidence` | `["evidence", market_id, evidence_id: u32]` | Evidence item + mini-market pools |
| `EvidenceVault` | `["evidence_vault", market_id, evidence_id]` | SOL escrow for bond + evidence stakes |
| `Position` | `["position", market_id, user: Pubkey]` | Per-user bet amounts |
| `EvidenceStake` | `["estake", market_id, evidence_id, user]` | Per-user evidence stake |
| `UserProfile` | `["profile", user: Pubkey]` | Karma + activity counters |
| `ResolutionBundle` | `["resolution", market_id]` | Final resolution record |
| `Treasury` | `["treasury"]` | Accumulated fees |

### 14 Instructions

```
Phase 1 — Core Protocol
  initialize(fee_bps)               → Config + Treasury
  create_market(claim, cat, expiry) → Market + MarketVault
  place_bet(outcome, amount)        → Position, transfers to vault
  initialize_user_profile()         → UserProfile

Phase 2 — Settlement
  create_resolution_bundle(outcome, ids, rationale) → ResolutionBundle
  resolve_market()                  → finalizes Market.state = Resolved
  settle_position()                 → pays winner from vault
  collect_fees()                    → drains treasury to fee_recipient

Phase 3 — Evidence
  submit_evidence(side, uri, hash, parent, bond) → Evidence + EvidenceVault
  stake_evidence(side, amount)      → EvidenceStake, transfers to evidence vault
  challenge_evidence()              → increments challenge_count
  settle_evidence_stake()           → pays winner from evidence vault
  slash_bond(evidence_id)           → moves bond to treasury, marks Slashed

  update_karma(user, type, delta)   → admin updates UserProfile karma
```

### Market State Machine

```
Open ──(bet/evidence)──► Closed ──(admin)──► Resolving ──(admin)──► Resolved
                                                                         │
                                                              ◄──(disputed)──┘
```

### Evidence Status Machine

```
Active ──(5 challenges)──► Challenged
     \                           \
      ──(resolution)──► Included  ──(resolution)──► Excluded
      ──(slash_bond)──► Slashed
```

---

## 5. Economic Model

### Fee Structure

- Default fee: `250 bps` (2.5%)
- Configurable per deploy via `initialize(fee_bps)`
- Fee is deducted from the total pool at settlement time
- Fees accumulate on-chain in Treasury PDA, drained by admin via `collect_fees`

### Payout Math (u128 intermediate)

```rust
let total: u128 = (yes_pool + no_pool) as u128;
let fee: u128 = total * fee_bps as u128 / 10_000;
let distributable: u128 = total - fee;
let payout: u128 = distributable * user_winning_amount as u128 / winning_pool as u128;
```

**Edge cases handled:**
- `winning_pool == 0` → full refund to all bettors (no fee)
- `outcome == Invalid` → proportional refund of all stakes
- Double-claim → `AlreadyClaimed` error via on-chain `claimed` flag

### Evidence Bond Economics

| Event | Bond fate |
|---|---|
| Evidence included in bundle | Bond returned to author |
| Evidence excluded | Bond returned to author (no penalty for being wrong) |
| Evidence slashed by admin | Bond transferred to Treasury |

This makes slashing a meaningful admin action for provably fraudulent or malicious evidence, not a routine exclusion.

---

## 6. Resolution Strategy

PMarket uses a **hybrid resolution model** that combines:

### 1. Off-Chain LLM Analysis (Advisory)

The `llm-judge` service constructs a structured prompt containing:
- The market claim
- All evidence items (content fetched from IPFS)
- Evidence metadata (side, bond, stake amounts, challenge count)

Claude returns a structured JSON recommendation:

```json
{
  "marketId": 42,
  "recommendedOutcome": "yes",
  "confidence": 87,
  "includedEvidenceIds": [0, 2, 5],
  "evidenceScores": [
    {
      "evidenceId": 0,
      "credibility": 92,
      "relevance": 88,
      "novelty": 65,
      "direction": "supports_yes",
      "isDuplicate": false,
      "reasoning": "Peer-reviewed source, directly addresses the claim..."
    }
  ],
  "rationale": "## Analysis\n\nThe preponderance of evidence..."
}
```

### 2. Human Admin Review (Authoritative)

The resolver dashboard shows:
- LLM recommendation with per-evidence scores
- Current staking distributions on each evidence item (the crowd's view)
- Challenge counts and status flags

The admin can:
- Accept the LLM recommendation as-is
- Override the outcome
- Modify which evidence IDs are included

### 3. On-Chain Finalization

The admin publishes two transactions:
1. `create_resolution_bundle(outcome, included_ids, rationale_uri)` — stores the resolution record, sets market to `Resolving`
2. `resolve_market()` — finalizes the market, enables settlement

All resolution data is immutable on-chain. The `rationale_uri` points to a full markdown rationale stored on IPFS.

### Why Not Pure Oracle Resolution?

| Approach | Pros | Cons |
|---|---|---|
| Switchboard/Pyth oracle | Trustless | Only works for price-feed claims |
| Pure DAO vote | Decentralized | Slow, governance attack surface |
| LLM-only | Fast, cheap | Hallucinations, not verifiable |
| **LLM-assisted admin** | Fast + auditable + overridable | Admin trust required |

For the MVP, admin resolution enables rapid iteration. A jury/DAO governance layer can be added on top of the existing `ResolutionBundle` mechanism without changing the settlement logic.

---

## 7. Tech Stack

| Layer | Technology |
|---|---|
| Smart Contracts | Rust, Anchor 0.30 |
| Chain | Solana (localnet / devnet) |
| Frontend | Next.js 14 (App Router), React 18, Tailwind CSS |
| Wallet | Solana Wallet Adapter (Phantom) |
| Indexer | TypeScript, `@solana/web3.js`, Prisma |
| Database | PostgreSQL |
| API | Express, Prisma |
| LLM Judge | TypeScript, `@anthropic-ai/sdk` (Claude) |
| Content Storage | IPFS (Pinata) |
| Infrastructure | Docker Compose |

---

## 8. Repo Structure

```
solana_pmarket/
├── Anchor.toml
├── Cargo.toml
├── package.json                    # npm workspaces: app, services/*
├── tsconfig.json                   # integration test config
├── docker-compose.yml              # postgres, indexer, api, llm-judge
├── .env.example
│
├── programs/
│   └── pmarket/
│       ├── Cargo.toml
│       └── src/
│           ├── lib.rs              # program entrypoint, 14 instructions
│           ├── errors.rs           # PmarketError enum
│           ├── state/
│           │   ├── config.rs
│           │   ├── market.rs       # MarketState, Outcome enums
│           │   ├── position.rs
│           │   ├── evidence.rs     # EvidenceSide, EvidenceStatus enums
│           │   ├── evidence_stake.rs
│           │   ├── user_profile.rs
│           │   └── resolution_bundle.rs
│           └── instructions/
│               ├── initialize.rs
│               ├── create_market.rs
│               ├── place_bet.rs
│               ├── submit_evidence.rs
│               ├── stake_evidence.rs
│               ├── challenge_evidence.rs
│               ├── create_resolution_bundle.rs
│               ├── resolve_market.rs
│               ├── settle_position.rs
│               ├── settle_evidence_stake.rs
│               ├── initialize_user_profile.rs
│               ├── update_karma.rs
│               ├── slash_bond.rs
│               └── collect_fees.rs
│
├── tests/
│   └── integration/
│       ├── 01_initialize.ts
│       ├── 02_create_market.ts
│       ├── 03_place_bet.ts
│       ├── 04_resolve_settle.ts
│       ├── 05_edge_cases.ts
│       ├── 06_evidence_flow.ts
│       └── 07_evidence_markets.ts
│
├── app/                            # Next.js 14 frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx            # Feed
│   │   │   ├── markets/[id]/       # Market detail
│   │   │   ├── create/             # Create market
│   │   │   ├── profile/[wallet]/   # User profile + karma
│   │   │   └── admin/              # Resolver dashboard
│   │   ├── components/             # 16 UI components
│   │   ├── hooks/                  # 7 data/transaction hooks
│   │   └── lib/                    # program.ts, pda.ts, api.ts, ipfs.ts
│   └── ...
│
├── services/
│   ├── indexer/                    # Polls Solana → PostgreSQL
│   │   ├── prisma/schema.prisma
│   │   └── src/
│   │       ├── index.ts
│   │       ├── listener.ts         # getProgramAccounts with memcmp filters
│   │       ├── parsers.ts          # Borsh deserializers for each account type
│   │       ├── db.ts               # Prisma upsert functions
│   │       └── ipfs.ts
│   ├── api/                        # REST API
│   │   └── src/
│   │       ├── index.ts
│   │       └── routes/
│   │           ├── markets.ts
│   │           ├── evidence.ts
│   │           ├── users.ts
│   │           ├── feed.ts
│   │           └── admin.ts
│   └── llm-judge/                  # Claude-powered analysis
│       └── src/
│           ├── index.ts
│           ├── analyzer.ts
│           ├── store.ts
│           └── types.ts
│
└── docs/
    └── architecture.md
```

---

## 9. Setup Instructions

### Prerequisites

| Tool | Version | Install |
|---|---|---|
| Rust | stable | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` |
| Solana CLI | 1.18+ | [docs.solana.com/cli/install](https://docs.solana.com/cli/install) |
| Anchor CLI | 0.30.1 | `cargo install --git https://github.com/coral-xyz/anchor avm --force && avm install 0.30.1` |
| Node.js | 20+ | [nodejs.org](https://nodejs.org) |
| Docker + Compose | latest | [docker.com](https://www.docker.com) |

### 1. Clone & Install

```bash
git clone https://github.com/WaverAndrew/BPenn26-Solana-Prediction-Market.git
cd BPenn26-Solana-Prediction-Market

# Install root-level JS deps (test runner)
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Solana
ANCHOR_PROVIDER_URL=http://localhost:8899
ANCHOR_WALLET=~/.config/solana/id.json

# PostgreSQL
DATABASE_URL=postgresql://pmarket:pmarket@localhost:5432/pmarket

# IPFS (Pinata) — get free key at pinata.cloud
PINATA_API_KEY=your_key
PINATA_SECRET_KEY=your_secret

# Claude API — get key at console.anthropic.com
ANTHROPIC_API_KEY=your_key

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_RPC_URL=http://localhost:8899
NEXT_PUBLIC_PROGRAM_ID=Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS
```

### 3. Build the Smart Contract

```bash
# Generate a local keypair if you don't have one
solana-keygen new --no-bip39-passphrase -o ~/.config/solana/id.json

# Build
anchor build
```

### 4. Run Integration Tests (localnet)

```bash
# In one terminal — start local validator
solana-test-validator

# In another terminal — run tests
anchor test --skip-local-validator
```

Tests cover: initialize, create market, place bet, resolve, settle, evidence submission, staking, and edge cases.

### 5. Start Off-Chain Services

```bash
# Start PostgreSQL + indexer + API + LLM judge
docker-compose up -d

# Run database migrations
cd services/indexer
npx prisma migrate dev

cd ../..
```

### 6. Start the Frontend

```bash
cd app
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Connect Phantom (set to localnet/devnet).

---

## 10. Deployment (Devnet)

### Deploy the Program

```bash
# Switch to devnet
solana config set --url devnet

# Airdrop SOL for deployment
solana airdrop 2

# Build + deploy
anchor build
anchor deploy --provider.cluster devnet
```

After deployment, update `NEXT_PUBLIC_PROGRAM_ID` in `.env` with the deployed program ID, and update `programs.devnet.pmarket` in `Anchor.toml`.

### Initialize the Protocol

```typescript
// Run after deploy
await program.methods
  .initialize(250) // 2.5% fee
  .accounts({ admin, config, treasury, systemProgram })
  .rpc();
```

### Verify Deployment

```bash
solana program show <PROGRAM_ID> --url devnet
```

---

## 11. API Reference

Base URL: `http://localhost:3001`

### Markets

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/markets` | List markets. Query: `?category=0&state=Open&sort=most_volume&page=1&limit=20` |
| `GET` | `/api/markets/:id` | Single market with resolution bundle |
| `GET` | `/api/markets/:id/evidence` | Threaded evidence tree |

### Users

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/users/:wallet` | Profile + all karma axes |
| `GET` | `/api/users/:wallet/positions` | All positions with market context |

### Feed

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/feed` | Returns `{ trending, newest, closing_soon }` |

### Admin

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/admin/markets/pending` | Open/Closed markets awaiting resolution |
| `GET` | `/api/admin/markets/:id/llm-review` | LLM recommendation for a market |

### LLM Judge (port 3002)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/judge/analyze/:marketId` | Trigger Claude analysis |
| `GET` | `/judge/recommendation/:marketId` | Retrieve latest recommendation |

---

## 12. Judgment Criteria Mapping

### Market Design
PMarket implements two correlated markets per prediction: the root binary outcome market and N evidence inclusion mini-markets. This creates richer incentive alignment — participants are rewarded not just for predicting correctly, but for surfacing the best information. The bonded evidence system gives authors skin in the game, and the challenge mechanism provides an in-protocol quality filter before admin review.

### Innovation
The key novelty is treating **evidence as a tradeable asset**. Each comment becomes a market: the crowd prices the relevance and credibility of information before any human resolver sees it. The LLM judge acts as an accelerant for the resolver, not a replacement. The on-chain karma system creates a persistent reputation layer on top of anonymous wallets, enabling trust-weighted information markets over time.

### Technical Merit
- **Rust/Anchor smart contracts**: 14 instructions, full PDA derivation with canonical seeds, `u128` overflow-safe arithmetic, proper account validation with `has_one` and constraint checks
- **Off-chain indexing**: memcmp-filtered `getProgramAccounts` with Borsh deserializers — no events or logs needed, works with any RPC provider
- **Frontend**: Next.js 14 App Router with server components, Anchor program initialization from IDL, PDA derivation mirrored exactly from on-chain seeds
- **LLM integration**: structured JSON output with per-evidence scores, the prompt is deterministic and auditable

### Functionality
Full end-to-end lifecycle on localnet and devnet:
1. Admin initializes protocol
2. User creates market with natural-language claim
3. Users bet YES or NO with SOL
4. Users submit bonded evidence (IPFS content, on-chain hash)
5. Users stake on evidence inclusion/exclusion
6. Admin triggers LLM analysis
7. Admin reviews scores + publishes ResolutionBundle on-chain
8. Admin finalizes resolution
9. Winners claim payouts from vaults
10. Karma updated for forecasters, evidence authors, and reviewers

### User Experience
- **No jargon**: "YES/NO" betting with SOL, plain English claims
- **Threaded evidence**: familiar comment-thread UI where each item shows its mini-market
- **Radar karma chart**: visual reputation display across 4 axes
- **Dark theme**: polished, modern UI appropriate for a finance application
- **Phantom wallet**: industry-standard wallet integration, one click to connect
- **Feed**: trending, newest, and closing-soon sections to surface active markets

---

## License

MIT
