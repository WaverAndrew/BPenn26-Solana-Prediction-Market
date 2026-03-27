import "dotenv/config";
import { Connection } from "@solana/web3.js";
import { syncAllAccounts } from "./listener";
import { prisma } from "./db";

const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS ?? "5000", 10);
const PROGRAM_ID = process.env.PROGRAM_ID ?? "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS";

let isRunning = false;

async function pollCycle(connection: Connection): Promise<void> {
  if (isRunning) {
    console.warn("[indexer] Previous poll cycle still running, skipping");
    return;
  }

  isRunning = true;
  const start = Date.now();

  try {
    await syncAllAccounts(connection, PROGRAM_ID);
    const elapsed = Date.now() - start;
    console.log(`[indexer] Poll cycle completed in ${elapsed}ms`);

    await prisma.indexerState.upsert({
      where: { key: "last_poll" },
      update: { value: new Date().toISOString() },
      create: { key: "last_poll", value: new Date().toISOString() },
    });
  } catch (err) {
    console.error("[indexer] Poll cycle error:", err);
  } finally {
    isRunning = false;
  }
}

async function main(): Promise<void> {
  console.log(`[indexer] Starting with RPC=${SOLANA_RPC_URL}, program=${PROGRAM_ID}`);
  console.log(`[indexer] Poll interval: ${POLL_INTERVAL_MS}ms`);

  const connection = new Connection(SOLANA_RPC_URL, "confirmed");

  // Verify connectivity
  try {
    const version = await connection.getVersion();
    console.log(`[indexer] Connected to Solana node, version: ${JSON.stringify(version)}`);
  } catch (err) {
    console.error("[indexer] Failed to connect to Solana RPC:", err);
    process.exit(1);
  }

  // Initial poll
  await pollCycle(connection);

  // Start polling loop
  const interval = setInterval(() => {
    pollCycle(connection);
  }, POLL_INTERVAL_MS);

  // Graceful shutdown
  const shutdown = async () => {
    console.log("[indexer] Shutting down...");
    clearInterval(interval);
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("[indexer] Fatal error:", err);
  process.exit(1);
});
