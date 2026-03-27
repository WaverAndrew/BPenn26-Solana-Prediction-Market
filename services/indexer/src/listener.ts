import { Connection, PublicKey, GetProgramAccountsFilter } from "@solana/web3.js";
import {
  DISCRIMINATORS,
  parseMarket,
  parseEvidence,
  parsePosition,
  parseEvidenceStake,
  parseUserProfile,
  parseResolutionBundle,
  parseConfig,
} from "./parsers";
import {
  upsertMarket,
  upsertEvidence,
  upsertPosition,
  upsertEvidenceStake,
  upsertUserProfile,
  upsertResolutionBundle,
} from "./db";

// -------------------------------------------------------------------
// Fetch accounts by discriminator
// -------------------------------------------------------------------

async function fetchAccountsByDiscriminator(
  connection: Connection,
  programId: PublicKey,
  discriminator: Buffer
): Promise<{ pubkey: PublicKey; data: Buffer }[]> {
  const filters: GetProgramAccountsFilter[] = [
    {
      memcmp: {
        offset: 0,
        bytes: discriminator.toString("base64"),
        encoding: "base64",
      },
    },
  ];

  const accounts = await connection.getProgramAccounts(programId, {
    filters,
    commitment: "confirmed",
  });

  return accounts.map((a) => ({
    pubkey: a.pubkey,
    data: Buffer.from(a.account.data),
  }));
}

// -------------------------------------------------------------------
// Sync functions per account type
// -------------------------------------------------------------------

async function syncMarkets(connection: Connection, programId: PublicKey): Promise<number> {
  const accounts = await fetchAccountsByDiscriminator(connection, programId, DISCRIMINATORS.Market);
  let count = 0;

  for (const account of accounts) {
    try {
      const parsed = parseMarket(account.data);
      await upsertMarket(parsed);
      count++;
    } catch (err) {
      console.error(`[listener] Failed to parse/upsert Market ${account.pubkey.toBase58()}:`, err);
    }
  }

  return count;
}

async function syncEvidence(connection: Connection, programId: PublicKey): Promise<number> {
  const accounts = await fetchAccountsByDiscriminator(connection, programId, DISCRIMINATORS.Evidence);
  let count = 0;

  for (const account of accounts) {
    try {
      const parsed = parseEvidence(account.data);
      await upsertEvidence(parsed);
      count++;
    } catch (err) {
      console.error(`[listener] Failed to parse/upsert Evidence ${account.pubkey.toBase58()}:`, err);
    }
  }

  return count;
}

async function syncPositions(connection: Connection, programId: PublicKey): Promise<number> {
  const accounts = await fetchAccountsByDiscriminator(connection, programId, DISCRIMINATORS.Position);
  let count = 0;

  for (const account of accounts) {
    try {
      const parsed = parsePosition(account.data);
      await upsertPosition(parsed);
      count++;
    } catch (err) {
      console.error(`[listener] Failed to parse/upsert Position ${account.pubkey.toBase58()}:`, err);
    }
  }

  return count;
}

async function syncEvidenceStakes(connection: Connection, programId: PublicKey): Promise<number> {
  const accounts = await fetchAccountsByDiscriminator(connection, programId, DISCRIMINATORS.EvidenceStake);
  let count = 0;

  for (const account of accounts) {
    try {
      const parsed = parseEvidenceStake(account.data);
      await upsertEvidenceStake(parsed);
      count++;
    } catch (err) {
      console.error(`[listener] Failed to parse/upsert EvidenceStake ${account.pubkey.toBase58()}:`, err);
    }
  }

  return count;
}

async function syncUserProfiles(connection: Connection, programId: PublicKey): Promise<number> {
  const accounts = await fetchAccountsByDiscriminator(connection, programId, DISCRIMINATORS.UserProfile);
  let count = 0;

  for (const account of accounts) {
    try {
      const parsed = parseUserProfile(account.data);
      await upsertUserProfile(parsed);
      count++;
    } catch (err) {
      console.error(`[listener] Failed to parse/upsert UserProfile ${account.pubkey.toBase58()}:`, err);
    }
  }

  return count;
}

async function syncResolutionBundles(connection: Connection, programId: PublicKey): Promise<number> {
  const accounts = await fetchAccountsByDiscriminator(connection, programId, DISCRIMINATORS.ResolutionBundle);
  let count = 0;

  for (const account of accounts) {
    try {
      const parsed = parseResolutionBundle(account.data);
      await upsertResolutionBundle(parsed);
      count++;
    } catch (err) {
      console.error(`[listener] Failed to parse/upsert ResolutionBundle ${account.pubkey.toBase58()}:`, err);
    }
  }

  return count;
}

// -------------------------------------------------------------------
// Main sync orchestrator
// -------------------------------------------------------------------

export async function syncAllAccounts(connection: Connection, programIdStr: string): Promise<void> {
  const programId = new PublicKey(programIdStr);

  console.log("[listener] Syncing all account types...");

  // Fetch Config accounts for logging (not stored in DB currently)
  try {
    const configAccounts = await fetchAccountsByDiscriminator(connection, programId, DISCRIMINATORS.Config);
    for (const account of configAccounts) {
      const config = parseConfig(account.data);
      console.log(`[listener] Config: authority=${config.authority}, marketCount=${config.marketCount}`);
    }
  } catch (err) {
    console.error("[listener] Failed to sync Config:", err);
  }

  // Sync in dependency order: markets first, then dependent entities
  const marketCount = await syncMarkets(connection, programId);
  console.log(`[listener] Synced ${marketCount} markets`);

  // These can run in parallel since they all depend only on markets existing
  const [evidenceCount, positionCount, stakeCount, profileCount, bundleCount] = await Promise.all([
    syncEvidence(connection, programId),
    syncPositions(connection, programId),
    syncEvidenceStakes(connection, programId),
    syncUserProfiles(connection, programId),
    syncResolutionBundles(connection, programId),
  ]);

  console.log(
    `[listener] Synced ${evidenceCount} evidence, ${positionCount} positions, ` +
    `${stakeCount} stakes, ${profileCount} profiles, ${bundleCount} resolution bundles`
  );
}
