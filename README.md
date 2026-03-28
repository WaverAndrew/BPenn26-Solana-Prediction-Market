<div align="center">

# tiksol! 🔮

### Social Prediction Market on Solana

*Swipe. Bet. Earn. Every claim is a market. Every comment is evidence.*

<br />

[![Solana](https://img.shields.io/badge/Solana-Devnet-9945FF?style=for-the-badge&logo=solana&logoColor=white)](https://solana.com)
[![Anchor](https://img.shields.io/badge/Anchor-0.31.1-14F195?style=for-the-badge)](https://www.anchor-lang.com)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

<br />

**Live on Solana Devnet** · Program ID: `FKW68DSiFayFBepk5WoZb19CXNELiqjQy1yTndvwF2y8`

<br />

---

### 📸 Interface

<br />

| Feed — Swipe & Bet | Market Detail — Evidence Thread |
|:---:|:---:|
| ![tiksol feed screen](docs/screenshots/feed.png) | ![tiksol market detail screen](docs/screenshots/market.png) |

<br />

---

</div>

## Table of Contents

1. [What Is tiksol!](#1-what-is-tiksol)
2. [Market Mechanism Design](#2-market-mechanism-design)
3. [Innovation — Beyond Standard Binary Markets](#3-innovation--beyond-standard-binary-markets)
4. [Architecture Overview](#4-architecture-overview)
5. [Smart Contract Design](#5-smart-contract-design)
6. [Economic Model](#6-economic-model)
7. [Resolution Strategy](#7-resolution-strategy)
8. [Tech Stack](#8-tech-stack)
9. [Repo Structure](#9-repo-structure)
10. [Setup Instructions](#10-setup-instructions)
11. [Devnet Deployment](#11-devnet-deployment)
12. [API Reference](#12-api-reference)
13. [Judgment Criteria Mapping](#13-judgment-criteria-mapping)

---

## 1. What Is tiksol!

tiksol! is a social prediction market built on Solana. It takes the addictive vertical-scroll experience of TikTok and replaces passive content consumption with active financial participation: swipe through open prediction markets, double-tap to open a YES bet, stake SOL on an outcome, and submit or challenge evidence — all in a single mobile-first interface with instant Phantom wallet signing.

The core insight is that **prediction markets are most powerful when they aggregate not just bets, but the reasoning behind those bets**. tiksol! makes evidence a first-class on-chain primitive: every piece of supporting or opposing information is a separately staked mini-market where the crowd votes on its credibility before any human resolver touches it.

---

## 2. Market Mechanism Design

### Root Market — Parimutuel Binary Pools

Each market is a **binary parimutuel pool** over a natural-language claim (e.g. *"Will GPT-5 pass a blind Turing test conducted by a major university?"*).

Users place SOL bets into a YES pool or a NO pool. When the market resolves:

```
total         = yes_pool + no_pool
fee           = total × fee_bps / 10,000
distributable = total − fee
payout_i      = distributable × user_stake_i / winning_pool
```

All arithmetic uses `u128` intermediates to prevent overflow at any realistic pool size. Fees accumulate in an on-chain Treasury PDA and are drained by the admin to a configurable fee recipient.

**Why parimutuel?**

| Property | Parimutuel | AMM (CPPM) | CLOB |
|---|---|---|---|
| No liquidity bootstrap needed | ✅ | ❌ | ❌ |
| Implementation complexity | Low | Medium | High |
| Slippage for large bets | None | Yes | Yes |
| Correct EV math for binary outcome | ✅ | ✅ | ✅ |

For a consumer-facing product targeting accessibility over sophisticated market-making, parimutuel is the right trade-off.

### Evidence Layer — The Novel Contribution

Every market has an attached **evidence thread**. Any user can post an evidence item with:

- A **side** (supports YES / supports NO / neutral)
- A **content URI** pointing to the full text stored on IPFS
- A **content hash** (SHA-256 of the text, stored on-chain for integrity)
- A **bond** (minimum 0.01 SOL) the author puts at risk

Each evidence item is itself a **mini prediction market** — users stake SOL on whether that piece of evidence will be *included* in the final resolution bundle. This creates a second-order market: *"Is this evidence credible enough to matter?"*

```
evidence_payout_i = total_evidence_pool × user_stake_i / winning_side_pool
```

The resolution bundle published on-chain specifies exactly which evidence IDs are included. Stakers who backed the correct side win the opposing side's funds.

### Karma System

On-chain `UserProfile` PDAs accumulate reputation across four axes:

| Axis | Earned by |
|---|---|
| `forecast_karma` | Accurate market bets |
| `evidence_karma` | Evidence items included in final bundles |
| `reviewer_karma` | Evidence stakes that correctly predicted inclusion |
| `challenge_karma` | Successful challenges to low-quality evidence |

Karma is computed off-chain post-settlement and written via an admin-privileged `update_karma` instruction, keeping on-chain logic lean while enabling rich persistent reputation signals per wallet.

---

## 3. Innovation — Beyond Standard Binary Markets

### What's New

**Dual-layer staking.** Most prediction markets have one pool per market. tiksol! has *N+1* pools — one for the root binary outcome, and one per evidence item. Accuracy is rewarded at two levels: outcome prediction and information quality assessment.

**Evidence as tradeable on-chain assets.** Each `Evidence` PDA stores:
- A content hash (verifiable against IPFS content)
- A bond (author has skin in the game)
- Inclusion / exclusion staking pools
- Challenge count and status (`Active → Challenged → Included / Excluded / Slashed`)
- Parent evidence ID (enabling threaded discourse with full on-chain provenance)

**LLM-assisted human resolution.** The `llm-judge` service uses Claude to score each evidence item across credibility, relevance, novelty, and alignment with the claim. These scores are advisory — a human admin publishes the final `ResolutionBundle` on-chain. The LLM accelerates resolution without removing accountability.

**Social graph as price discovery.** The threaded evidence structure means the information surface is a tree, not a flat order book. Parent-child relationships let users directly rebut or support specific claims, creating a structured argument graph that the resolver can traverse.

**TikTok UX.** The feed page is a full-screen vertical scroll with one market per card, automatic video backgrounds per category, and double-tap-to-bet — lowering the participation friction for non-crypto-native users to near zero.

### Comparison

| Feature | Standard Prediction Market | tiksol! |
|---|---|---|
| Outcome | Binary | Binary + evidence inclusion |
| Information aggregation | Prices only | Prices + ranked evidence corpus |
| Author accountability | None | Bonded evidence |
| Dispute mechanism | Oracle | Challenge + LLM + admin review |
| On-chain user identity | None | Karma-weighted profiles |
| Content verifiability | None | SHA-256 hash on-chain, content on IPFS |
| UX | Web form | TikTok-style swipe feed |

---

## 4. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                  tiksol! Frontend (Next.js 14)              │
│  Feed · Market Detail · Create · Profile · Admin            │
└──────────────┬──────────────────────────┬───────────────────┘
               │ REST API                 │ RPC (Solana)
               ▼                          ▼
┌──────────────────────┐    ┌─────────────────────────────────┐
│   API Service        │    │   Solana Devnet                 │
│   (Express + Prisma) │    │                                 │
│   /api/markets       │    │   Program: pmarket              │
│   /api/feed          │    │   14 instructions               │
│   /api/users         │    │   10 PDA account types          │
│   /api/admin         │    │   SOL vaults per market         │
└──────────┬───────────┘    └────────────┬────────────────────┘
           │                             │
           ▼                             │
┌──────────────────────┐                 │
│   PostgreSQL         │◄── Indexer ─────┘
│   (Prisma)           │    (polls getProgramAccounts)
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
1. User connects Phantom wallet → signs transactions directly from the browser
2. Transactions land on Solana Devnet → state mutates on-chain
3. Indexer polls `getProgramAccounts` every 5s → deserializes accounts and upserts to PostgreSQL
4. API reads PostgreSQL → serves paginated REST responses to the frontend
5. Admin triggers LLM Judge → Claude analyzes evidence → admin reviews scores → publishes `ResolutionBundle` on-chain
6. Winners call `settle_position` or `settle_evidence_stake` → SOL transferred from PDA vaults

---

## 5. Smart Contract Design

### Deployed Program

| Network | Program ID |
|---|---|
| **Solana Devnet** | `FKW68DSiFayFBepk5WoZb19CXNELiqjQy1yTndvwF2y8` |

### Account PDAs

| Account | Seeds | Purpose |
|---|---|---|
| `Config` | `["config"]` | Protocol admin, fee bps, market counter |
| `Market` | `["market", market_id: u64 LE]` | Claim URI, pools, state machine, outcome |
| `MarketVault` | `["vault", market_id: u64 LE]` | SOL escrow for bets |
| `Evidence` | `["evidence", market_id, evidence_id: u32 LE]` | Evidence item + mini-market pools |
| `EvidenceVault` | `["evidence_vault", market_id, evidence_id]` | SOL escrow for bond + stakes |
| `Position` | `["position", market_id, user: Pubkey]` | Per-user YES/NO amounts |
| `EvidenceStake` | `["estake", market_id, evidence_id, user]` | Per-user evidence stake |
| `UserProfile` | `["profile", user: Pubkey]` | Karma axes + activity counters |
| `ResolutionBundle` | `["resolution", market_id]` | Final resolution record |
| `Treasury` | `["treasury"]` | Accumulated protocol fees |

### 14 Instructions

```
Phase 1 — Core Protocol
  initialize(fee_bps)                        → Config + Treasury PDAs
  create_market(claim_uri, category, expiry) → Market + MarketVault PDAs
  place_bet(outcome: u8, amount: u64)        → Position PDA (init_if_needed), transfer to vault
  initialize_user_profile()                  → UserProfile PDA

Phase 2 — Settlement
  create_resolution_bundle(outcome, ids, rationale_uri) → ResolutionBundle, Market → Resolving
  resolve_market()                           → Market → Resolved
  settle_position()                          → Transfers payout from MarketVault to user
  collect_fees()                             → Drains Treasury to fee_recipient

Phase 3 — Evidence
  submit_evidence(side, uri, hash, parent_id, bond)  → Evidence + EvidenceVault PDAs
  stake_evidence(side: u8, amount: u64)              → EvidenceStake PDA
  challenge_evidence()                               → Increments challenge_count
  settle_evidence_stake()                            → Transfers payout from EvidenceVault
  slash_bond(evidence_id)                            → Bond → Treasury, status → Slashed
  update_karma(user, karma_type, delta)              → Updates UserProfile (admin-only)
```

### Market State Machine

```
Open ──(expiry / admin)──► Closed ──(admin)──► Resolving ──(admin)──► Resolved
                                                                           │
                                                               ◄──(disputed)──┘
```

### Evidence Status Machine

```
Active ──(≥5 challenges)──► Challenged
     ╲                            ╲
      ──(included in bundle)──► Included   ──(settle_evidence_stake)──► claimed
      ──(excluded from bundle)──► Excluded
      ──(slash_bond)──► Slashed
```

---

## 6. Economic Model

### Fee Structure

- Configurable fee in basis points (`fee_bps`), set at protocol initialization
- Fee is deducted from the total pool at settlement time, before distribution
- Fees accumulate in the on-chain Treasury PDA and are drained by the admin via `collect_fees`

### Payout Formula (overflow-safe `u128`)

```rust
let total: u128        = (yes_pool + no_pool) as u128;
let fee: u128          = total * fee_bps as u128 / 10_000;
let distributable: u128 = total - fee;
let payout: u128       = distributable * user_winning_amount as u128 / winning_pool as u128;
```

**Edge cases handled:**
- `winning_pool == 0` → full refund to all bettors (fee waived)
- `outcome == Invalid` → proportional refund of all stakes
- Double-claim attempt → `AlreadyClaimed` error via on-chain `claimed` flag

### Evidence Bond Economics

| Event | Bond fate |
|---|---|
| Evidence included in bundle | Bond returned to author |
| Evidence excluded from bundle | Bond returned to author |
| Evidence slashed by admin | Bond transferred to Treasury |

Slashing is a reserved admin action for provably fraudulent or malicious submissions — not a routine exclusion penalty — preserving incentives for genuine-but-wrong evidence.

---

## 7. Resolution Strategy

tiksol! uses a **hybrid resolution model** combining crowd-sourced evidence staking, LLM-assisted analysis, and on-chain finalization by a human admin.

### Step 1 — Crowd Staking (Continuous)

From the moment evidence is submitted until the market closes, any user can stake SOL on whether each piece of evidence should be included in the final resolution bundle. This gives the admin a real-time signal of which evidence the market participants find credible.

### Step 2 — LLM Analysis (Advisory)

The `llm-judge` service constructs a structured prompt containing the market claim, all evidence items (fetched from IPFS), and their on-chain metadata (side, bond, stake distributions, challenge count). Claude returns a structured recommendation:

```json
{
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
      "reasoning": "Peer-reviewed source directly addresses the claim..."
    }
  ],
  "rationale": "The preponderance of evidence supports a YES outcome..."
}
```

### Step 3 — Human Admin Review (Authoritative)

The resolver dashboard shows the LLM recommendation alongside the crowd's staking distributions. The admin can accept the recommendation, override the outcome, or adjust which evidence IDs are included.

### Step 4 — On-Chain Finalization

The admin publishes two transactions:
1. `create_resolution_bundle(outcome, included_ids, rationale_uri)` — stores the immutable resolution record, sets market to `Resolving`
2. `resolve_market()` — finalizes the market, unlocks settlement for all participants

The `rationale_uri` points to a full markdown rationale stored on IPFS.

### Why Not Pure Oracle Resolution?

| Approach | Pros | Cons |
|---|---|---|
| Switchboard / Pyth oracle | Trustless | Only works for price-feed claims, not natural-language questions |
| Pure DAO vote | Decentralized | Slow, governance attack surface |
| LLM-only | Fast, cheap | Hallucinations, not on-chain verifiable |
| **LLM-assisted admin (tiksol!)** | Fast + auditable + overridable + works for any claim | Admin trust required |

The current hybrid model is intentional for the MVP. A jury or DAO governance layer can be composed on top of the existing `ResolutionBundle` structure without changing any settlement logic.

---

## 8. Tech Stack

| Layer | Technology |
|---|---|
| Smart Contracts | Rust, Anchor 0.31.1 |
| Chain | Solana Devnet |
| Frontend | Next.js 14 (App Router), React 18, Tailwind CSS |
| Wallet | Solana Wallet Adapter (Phantom) |
| Anchor Client | `@coral-xyz/anchor` 0.31.1 |
| Indexer | TypeScript, `@solana/web3.js`, Prisma |
| Database | PostgreSQL |
| API | Express, Prisma |
| LLM Judge | TypeScript, `@anthropic-ai/sdk` (Claude) |
| Content Storage | IPFS (Pinata) |
| Infrastructure | Docker Compose |

---

## 9. Repo Structure

```
solana_pmarket/
├── Anchor.toml                         # Anchor config, devnet program ID
├── Cargo.toml                          # Rust workspace
├── package.json                        # npm workspaces: app, services/*
├── docker-compose.yml                  # postgres, indexer, api, llm-judge
│
├── programs/
│   └── pmarket/
│       └── src/
│           ├── lib.rs                  # Program entrypoint, 14 instructions
│           ├── errors.rs               # PmarketError enum (24 error codes)
│           ├── state/
│           │   ├── config.rs
│           │   ├── market.rs           # MarketState, Outcome enums
│           │   ├── position.rs
│           │   ├── evidence.rs         # EvidenceSide, EvidenceStatus enums
│           │   ├── evidence_stake.rs
│           │   ├── user_profile.rs
│           │   └── resolution_bundle.rs
│           └── instructions/           # One file per instruction (14 total)
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
├── app/                                # Next.js 14 frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx                # TikTok-style swipe feed
│   │   │   ├── markets/[id]/           # Market detail + evidence thread
│   │   │   ├── create/                 # Market creation form
│   │   │   ├── profile/[wallet]/       # User profile + karma display
│   │   │   └── admin/                  # Resolver dashboard
│   │   ├── components/                 # 16 UI components
│   │   ├── hooks/                      # 7 data/transaction hooks
│   │   └── lib/
│   │       ├── program.ts              # AnchorProvider + Program setup
│   │       ├── pda.ts                  # Client-side PDA derivation (mirrors on-chain seeds)
│   │       ├── api.ts                  # REST API client
│   │       ├── idl.json                # Generated Anchor IDL
│   │       └── ipfs.ts                 # Pinata upload helpers
│
└── services/
    ├── indexer/
    │   ├── prisma/schema.prisma
    │   └── src/
    │       ├── listener.ts             # getProgramAccounts with memcmp filters
    │       ├── parsers.ts              # Borsh deserializers per account type
    │       └── db.ts                   # Prisma upsert functions
    ├── api/
    │   └── src/routes/                 # markets, evidence, users, feed, admin
    └── llm-judge/
        └── src/
            ├── analyzer.ts             # Claude prompt construction + parsing
            └── store.ts                # In-memory recommendation cache
```

---

## 10. Setup Instructions

### Prerequisites

| Tool | Version |
|---|---|
| Rust | stable (1.75+) |
| Solana CLI | 1.18+ |
| Anchor CLI | 0.31.1 |
| Node.js | 20+ |
| Docker + Compose | latest |

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Install Anchor via AVM
cargo install --git https://github.com/coral-xyz/anchor avm --force
avm install 0.31.1 && avm use 0.31.1
```

### 1. Clone & Install

```bash
git clone https://github.com/your-org/solana_pmarket.git
cd solana_pmarket
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Key variables to set:

```env
# Solana
ANCHOR_PROVIDER_URL=https://api.devnet.solana.com
ANCHOR_WALLET=~/.config/solana/id.json

# PostgreSQL (Docker Compose provides this automatically)
DATABASE_URL=postgresql://pmarket:pmarket@localhost:5432/pmarket

# IPFS — free key at pinata.cloud
PINATA_API_KEY=your_key
PINATA_SECRET_KEY=your_secret

# Claude API — get key at console.anthropic.com
ANTHROPIC_API_KEY=your_key
```

The frontend automatically connects to the deployed devnet program — no additional frontend config is required to interact with the live deployment.

### 3. Build the Smart Contract

```bash
anchor build
```

### 4. Run Integration Tests (localnet)

```bash
# Terminal 1 — start local validator
solana-test-validator

# Terminal 2 — run full test suite
anchor test --skip-local-validator
```

Tests cover: initialize, create market, place bet, resolve, settle, evidence submission, evidence staking, challenge flow, and edge cases (zero pool, invalid outcome, double-claim).

### 5. Start Off-Chain Services

```bash
# Start PostgreSQL + indexer + API + LLM judge
docker-compose up -d

# Run database migrations
cd services/indexer && npx prisma migrate dev && cd ../..
```

### 6. Start the Frontend

```bash
cd app
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Connect Phantom set to **Devnet**. The app will talk to the live deployed program.

---

## 11. Devnet Deployment

### Live Deployment

The program is already deployed and initialized on Solana Devnet:

| | |
|---|---|
| **Program ID** | `FKW68DSiFayFBepk5WoZb19CXNELiqjQy1yTndvwF2y8` |
| **Network** | Solana Devnet |
| **Config PDA** | `A32ViBx21mpKekfB23kmLmtm9w6ddC19PDXConKZzvoT` |
| **Active markets** | Market #10: *"Will GPT-5 pass a blind Turing test conducted by a major university?"* |

Verify on-chain:

```bash
solana program show FKW68DSiFayFBepk5WoZb19CXNELiqjQy1yTndvwF2y8 --url devnet
```

### Deploy Your Own Instance

```bash
# Switch to devnet and fund your wallet
solana config set --url devnet
solana airdrop 2

# Build and deploy
anchor build
anchor deploy --provider.cluster devnet

# Initialize the protocol (run once after deploy)
# See tests/integration/01_initialize.ts for reference
```

---

## 12. API Reference

The API service exposes REST endpoints that serve indexed on-chain data.

### Markets

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/feed` | Paginated market feed |
| `GET` | `/api/markets/:id` | Single market with full state |
| `GET` | `/api/markets/:id/evidence` | Threaded evidence tree |
| `GET` | `/api/markets/:id/positions/:wallet` | User's position in a market |

### Users

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/profiles/:wallet` | Profile + all karma axes |
| `GET` | `/api/profiles/:wallet/positions` | All positions across markets |

### Admin

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/admin/pending` | Markets awaiting resolution |
| `GET` | `/api/admin/markets/:id/review` | LLM recommendation for a market |

### LLM Judge (separate service)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/judge/analyze/:marketId` | Trigger Claude analysis |
| `GET` | `/judge/recommendation/:marketId` | Retrieve latest recommendation |

---

## 13. Judgment Criteria Mapping

### Market Design
tiksol! implements two correlated market layers per prediction: the root binary outcome market and N evidence inclusion mini-markets. Participants are rewarded not just for predicting correctly, but for surfacing and vetting the best information. The bonded evidence system gives authors skin in the game, and the challenge mechanism provides an in-protocol quality filter before any human resolver is involved. Parimutuel pools ensure no liquidity bootstrapping is required, making it practical for new markets to form organically.

### Innovation
The key novelty is treating **evidence as a tradeable on-chain asset**. Each comment becomes a market: the crowd prices the relevance and credibility of information before the resolver sees it. The LLM judge acts as an accelerant, not a replacement for human judgment — scores are advisory, the `ResolutionBundle` is authoritative. The on-chain karma system creates a persistent reputation layer on top of anonymous wallets, enabling trust-weighted information markets over time. The TikTok-style UX is a deliberate attempt to expand prediction market participation beyond crypto-native audiences.

### Technical Merit
- **Rust/Anchor smart contracts**: 14 instructions across 3 phases, full PDA derivation with canonical seeds, `u128` overflow-safe arithmetic, proper account validation with `constraint` checks and `has_one` guards
- **Off-chain indexing**: memcmp-filtered `getProgramAccounts` with custom Borsh deserializers — no events needed, works with any standard RPC endpoint
- **Frontend**: Next.js 14 App Router, Anchor 0.31.1 client matching the deployed program version, PDA derivation mirrored exactly from on-chain seeds, `useAnchorCompatibleWallet` hook for reliable `AnchorWallet` construction from Phantom adapter
- **LLM integration**: structured JSON output with per-evidence scores, fully deterministic and auditable prompts

### Functionality
Full end-to-end lifecycle deployed and operational on Solana Devnet:

1. Admin initializes protocol on-chain
2. User creates a market with a natural-language claim (stored on IPFS, hash on-chain)
3. Users bet YES or NO with SOL — parimutuel pools update atomically
4. Users submit bonded evidence (IPFS content, SHA-256 hash on-chain)
5. Users stake SOL on evidence inclusion or exclusion
6. Users challenge low-quality evidence
7. Admin triggers LLM analysis → Claude scores evidence
8. Admin reviews scores + crowd distributions → publishes `ResolutionBundle` on-chain
9. Admin calls `resolve_market()` → market finalized
10. Winners call `settle_position` / `settle_evidence_stake` → SOL transferred from vaults
11. Admin calls `update_karma` → reputation updated for all participants

### User Experience
- **Double-tap to bet**: double-clicking anywhere on a card triggers a YES bet popup with a TikTok-style heart burst animation — friction as low as physically possible
- **Swipe feed**: full-screen vertical scroll with snap points, one market per card, video backgrounds per category
- **Instant wallet connect**: Phantom integration with one click, standard across the Solana ecosystem
- **Plain-language markets**: natural-language claims, not ticker symbols or price targets — accessible to non-crypto audiences
- **Threaded evidence**: familiar comment-thread UI where each evidence item shows its mini-market staking distribution
- **Karma profiles**: visual reputation display across 4 axes visible on every user profile
- **Responsive dark UI**: polished Tailwind design, works on both desktop and mobile

---

## License

MIT
