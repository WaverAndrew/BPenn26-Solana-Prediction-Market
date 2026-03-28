/**
 * Seed script — creates demo markets, bets, evidence, and evidence stakes on devnet.
 *
 * Usage:
 *   npx ts-node -P tsconfig.json tests/seed_devnet.ts
 *
 * Requires: ANCHOR_WALLET env var pointing to a funded devnet keypair,
 * or the default ~/.config/solana/id.json wallet with devnet SOL.
 */

import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider, web3, BN } from "@coral-xyz/anchor";
import { Pmarket } from "../target/types/pmarket";

const provider = AnchorProvider.env();
anchor.setProvider(provider);
const program = anchor.workspace.Pmarket as Program<Pmarket>;
const wallet = provider.wallet;

function marketIdBytes(id: bigint): Buffer {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(id);
  return buf;
}

function evidenceIdBytes(id: number): Buffer {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(id);
  return buf;
}

function configPda() {
  return web3.PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    program.programId
  );
}

function marketPda(id: bigint) {
  return web3.PublicKey.findProgramAddressSync(
    [Buffer.from("market"), marketIdBytes(id)],
    program.programId
  );
}

function vaultPda(id: bigint) {
  return web3.PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), marketIdBytes(id)],
    program.programId
  );
}

function positionPda(marketId: bigint, user: web3.PublicKey) {
  return web3.PublicKey.findProgramAddressSync(
    [Buffer.from("position"), marketIdBytes(marketId), user.toBuffer()],
    program.programId
  );
}

function evidencePda(marketId: bigint, evidenceId: number) {
  return web3.PublicKey.findProgramAddressSync(
    [Buffer.from("evidence"), marketIdBytes(marketId), evidenceIdBytes(evidenceId)],
    program.programId
  );
}

function evidenceVaultPda(marketId: bigint, evidenceId: number) {
  return web3.PublicKey.findProgramAddressSync(
    [Buffer.from("evidence_vault"), marketIdBytes(marketId), evidenceIdBytes(evidenceId)],
    program.programId
  );
}

function evidenceStakePda(marketId: bigint, evidenceId: number, user: web3.PublicKey) {
  return web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("estake"),
      marketIdBytes(marketId),
      evidenceIdBytes(evidenceId),
      user.toBuffer(),
    ],
    program.programId
  );
}

async function getMarketCounter(): Promise<bigint> {
  const [cfg] = configPda();
  const config = await program.account.config.fetch(cfg);
  return BigInt(config.marketCounter.toString());
}

async function createMarket(
  claimUri: string,
  category: number,
  daysFromNow: number,
  metadataUri: string
): Promise<bigint> {
  const counter = await getMarketCounter();
  const [mPda] = marketPda(counter);
  const [vPda] = vaultPda(counter);
  const [cfgPda] = configPda();
  const expiry = new BN(Math.floor(Date.now() / 1000) + 86400 * daysFromNow);

  await program.methods
    .createMarket(claimUri, category, expiry, metadataUri)
    .rpc();

  console.log(`  Created market ${counter} → ${mPda.toBase58()}`);
  return counter;
}

async function placeBet(marketId: bigint, outcome: 0 | 1, solAmount: number) {
  const [mPda] = marketPda(marketId);
  const [vPda] = vaultPda(marketId);
  const [cfgPda] = configPda();
  const [posPda] = positionPda(marketId, wallet.publicKey);

  await (program.methods
    .placeBet(outcome, new BN(Math.round(solAmount * 1e9))) as any)
    .accountsPartial({
      bettor: wallet.publicKey,
      config: cfgPda,
      market: mPda,
      marketVault: vPda,
      position: posPda,
      systemProgram: web3.SystemProgram.programId,
    })
    .rpc();

  console.log(
    `  Bet ${solAmount} SOL on ${outcome === 0 ? "YES" : "NO"} for market ${marketId}`
  );
}

async function submitEvidence(
  marketId: bigint,
  side: 0 | 1 | 2,
  contentUri: string,
  contentHash: number[],
  parentEvidenceId: number | null,
  bondSol: number
): Promise<number> {
  const [cfgPda] = configPda();
  const [mPda] = marketPda(marketId);

  // Get current evidence count from market account
  const marketAccount = await program.account.market.fetch(mPda);
  const evidenceId = marketAccount.evidenceCount;

  const [ePda] = evidencePda(marketId, evidenceId);
  const [evPda] = evidenceVaultPda(marketId, evidenceId);

  await (program.methods
    .submitEvidence(
      side,
      contentUri,
      contentHash,
      parentEvidenceId,
      new BN(Math.round(bondSol * 1e9))
    ) as any)
    .accountsPartial({
      author: wallet.publicKey,
      config: cfgPda,
      market: mPda,
      evidence: ePda,
      evidenceVault: evPda,
      systemProgram: web3.SystemProgram.programId,
    })
    .rpc();

  console.log(`  Evidence ${evidenceId} submitted for market ${marketId}`);
  return evidenceId;
}

async function stakeEvidence(
  marketId: bigint,
  evidenceId: number,
  side: 0 | 1,
  solAmount: number
) {
  const [cfgPda] = configPda();
  const [mPda] = marketPda(marketId);
  const [ePda] = evidencePda(marketId, evidenceId);
  const [evPda] = evidenceVaultPda(marketId, evidenceId);
  const [esPda] = evidenceStakePda(marketId, evidenceId, wallet.publicKey);

  await (program.methods
    .stakeEvidence(side, new BN(Math.round(solAmount * 1e9))) as any)
    .accountsPartial({
      staker: wallet.publicKey,
      config: cfgPda,
      market: mPda,
      evidence: ePda,
      evidenceVault: evPda,
      evidenceStake: esPda,
      systemProgram: web3.SystemProgram.programId,
    })
    .rpc();

  console.log(
    `  Staked ${solAmount} SOL on ${side === 0 ? "INCLUDE" : "EXCLUDE"} for evidence ${evidenceId}`
  );
}

function dummyHash(text: string): number[] {
  // Simple deterministic 32-byte mock hash for seeding
  const arr = Array(32).fill(0);
  for (let i = 0; i < text.length && i < 32; i++) {
    arr[i] = text.charCodeAt(i) % 256;
  }
  return arr;
}

async function main() {
  console.log("🌱 Seeding devnet...");
  console.log(`   Wallet: ${wallet.publicKey.toBase58()}`);

  // ── Market 1: Bitcoin $200k ──────────────────────────────────────────────
  console.log("\n[Market 1] Bitcoin >$200k by EOY 2025");
  const m1 = await createMarket(
    "Will Bitcoin break $200k by December 2025?",
    2,
    30,
    "ipfs://QmDemo1"
  );
  await placeBet(m1, 0, 0.2); // YES
  await placeBet(m1, 1, 0.1); // NO

  const e1_1 = await submitEvidence(
    m1, 0,
    "BlackRock IBIT crossed $18B AUM in 6 months — structural institutional demand at scale never seen before.",
    dummyHash("e1_1"), null, 0.05
  );
  await stakeEvidence(m1, e1_1, 0, 0.05); // Include

  const e1_2 = await submitEvidence(
    m1, 1,
    "ETF flows are mostly basis-trade arbitrage, not directional longs. Real demand is overstated.",
    dummyHash("e1_2"), e1_1, 0.03
  );
  await stakeEvidence(m1, e1_2, 1, 0.03); // Exclude (reply challenges parent)

  await submitEvidence(
    m1, 0,
    "BTC exchange reserves at 5-year lows — coins are being withdrawn for long-term holding, not arb.",
    dummyHash("e1_3"), e1_1, 0.04
  );

  await submitEvidence(
    m1, 1,
    "Every post-halving cycle topped within 18 months. We're 14 months post-halving and the peak may be in.",
    dummyHash("e1_4"), null, 0.05
  );

  // ── Market 2: US Recession ───────────────────────────────────────────────
  console.log("\n[Market 2] US Recession 2025");
  const m2 = await createMarket(
    "Will the US economy enter a recession before end of 2025?",
    0,
    60,
    "ipfs://QmDemo2"
  );
  await placeBet(m2, 0, 0.1);
  await placeBet(m2, 1, 0.3);

  const e2_1 = await submitEvidence(
    m2, 0,
    "Yield curve inverted for 22 consecutive months — the longest inversion in US history. Every such inversion preceded recession.",
    dummyHash("e2_1"), null, 0.07
  );
  await stakeEvidence(m2, e2_1, 0, 0.05);

  await submitEvidence(
    m2, 1,
    "The yield curve has since un-inverted. Re-steepening from inversion is the actual recession signal — and it means the risk is OVER.",
    dummyHash("e2_2"), e2_1, 0.05
  );

  await submitEvidence(
    m2, 1,
    "Q4 2024 GDP at 3.1% annualized, unemployment 4.1%, consumer spending growing. Zero recessionary signal in real economy.",
    dummyHash("e2_3"), null, 0.06
  );

  // ── Market 3: SOL flip ETH ───────────────────────────────────────────────
  console.log("\n[Market 3] Solana flip Ethereum");
  const m3 = await createMarket(
    "Will Solana flip Ethereum by market cap in 2025?",
    2,
    90,
    "ipfs://QmDemo3"
  );
  await placeBet(m3, 0, 0.3);
  await placeBet(m3, 1, 0.15);

  const e3_1 = await submitEvidence(
    m3, 0,
    "Solana processes 65,000 TPS vs Ethereum's 30 TPS. As dApps scale, users migrate to chains that handle load.",
    dummyHash("e3_1"), null, 0.05
  );
  await stakeEvidence(m3, e3_1, 0, 0.08);

  await submitEvidence(
    m3, 1,
    "ETH L2s collectively process 200k+ TPS and inherit ETH security. Compare Solana to the L2 ecosystem, not L1 ETH.",
    dummyHash("e3_2"), e3_1, 0.05
  );

  await submitEvidence(
    m3, 0,
    "Pump.fun generated $500M+ in revenue in 2024 — more than most fintech companies. Solana owns consumer crypto.",
    dummyHash("e3_3"), null, 0.04
  );

  console.log("\n✅ Seed complete!");
  console.log(`   Market IDs created: ${m1}, ${m2}, ${m3}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
