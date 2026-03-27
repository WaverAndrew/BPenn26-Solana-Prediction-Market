import { Router, Request, Response } from "express";
import { prisma } from "../prisma";

export const feedRouter = Router();

const FEED_LIMIT = 10;

/**
 * GET /api/feed
 * Returns curated feed sections:
 *   - trending: markets with most total volume (yes_pool + no_pool)
 *   - new: most recently created markets
 *   - closing_soon: markets expiring soonest that are still open
 */
feedRouter.get("/", async (req: Request, res: Response) => {
  try {
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || FEED_LIMIT));
    const now = new Date();

    const [trending, newest, closingSoon] = await Promise.all([
      // Trending: order by total volume descending
      // Using raw query for computed sort on (yes_pool + no_pool)
      prisma.$queryRaw<
        Array<{
          id: number;
          creator: string;
          claim_uri: string;
          category: string;
          expiry: Date;
          state: number;
          outcome: number;
          yes_pool: bigint;
          no_pool: bigint;
          evidence_count: number;
          resolution_bundle: number;
          metadata_uri: string;
          created_at: Date;
          total_volume: bigint;
        }>
      >`
        SELECT *, (yes_pool + no_pool) AS total_volume
        FROM markets
        WHERE state IN (0, 1)
        ORDER BY total_volume DESC
        LIMIT ${limit}
      `,

      // Newest
      prisma.market.findMany({
        orderBy: { createdAt: "desc" },
        take: limit,
      }),

      // Closing soon: open markets sorted by expiry ascending
      prisma.market.findMany({
        where: {
          state: 0, // Open state
          expiry: { gt: now },
        },
        orderBy: { expiry: "asc" },
        take: limit,
      }),
    ]);

    res.json({
      data: {
        trending: trending.map((m) => ({
          id: m.id,
          creator: m.creator,
          claimUri: m.claim_uri,
          category: m.category,
          expiry: m.expiry instanceof Date ? m.expiry.toISOString() : m.expiry,
          state: m.state,
          outcome: m.outcome,
          yesPool: m.yes_pool.toString(),
          noPool: m.no_pool.toString(),
          totalVolume: m.total_volume.toString(),
          evidenceCount: m.evidence_count,
          metadataUri: m.metadata_uri,
          createdAt: m.created_at instanceof Date ? m.created_at.toISOString() : m.created_at,
        })),
        new: newest.map(serializeMarket),
        closingSoon: closingSoon.map(serializeMarket),
      },
    });
  } catch (err) {
    console.error("[api] GET /api/feed error:", err);
    res.status(500).json({ error: "Failed to fetch feed" });
  }
});

function serializeMarket(m: {
  id: number;
  creator: string;
  claimUri: string;
  category: string;
  expiry: Date;
  state: number;
  outcome: number;
  yesPool: bigint;
  noPool: bigint;
  evidenceCount: number;
  resolutionBundle: number;
  metadataUri: string;
  createdAt: Date;
}) {
  return {
    id: m.id,
    creator: m.creator,
    claimUri: m.claimUri,
    category: m.category,
    expiry: m.expiry.toISOString(),
    state: m.state,
    outcome: m.outcome,
    yesPool: m.yesPool.toString(),
    noPool: m.noPool.toString(),
    totalVolume: (m.yesPool + m.noPool).toString(),
    evidenceCount: m.evidenceCount,
    metadataUri: m.metadataUri,
    createdAt: m.createdAt.toISOString(),
  };
}
