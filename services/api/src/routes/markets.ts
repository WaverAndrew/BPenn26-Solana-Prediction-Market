import { Router, Request, Response } from "express";
import { prisma } from "../prisma";
import { Prisma } from "@prisma/client";

export const marketsRouter = Router();

/**
 * GET /api/markets
 * Query params:
 *   - page (default 1)
 *   - limit (default 20, max 100)
 *   - category (filter)
 *   - state (filter, numeric)
 *   - sort: "newest" | "closing_soon" | "most_volume" (default "newest")
 */
marketsRouter.get("/", async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.MarketWhereInput = {};

    if (req.query.category) {
      where.category = req.query.category as string;
    }

    if (req.query.state !== undefined) {
      where.state = parseInt(req.query.state as string);
    }

    let orderBy: Prisma.MarketOrderByWithRelationInput;
    const sort = req.query.sort as string;

    switch (sort) {
      case "closing_soon":
        orderBy = { expiry: "asc" };
        // Only show markets that haven't expired
        where.expiry = { gt: new Date() };
        break;
      case "most_volume":
        // Order by total pool (yes_pool + no_pool) — we use yesPool desc as proxy,
        // for true total volume we'd need a raw query or computed field
        orderBy = { yesPool: "desc" };
        break;
      case "newest":
      default:
        orderBy = { createdAt: "desc" };
        break;
    }

    const [markets, total] = await Promise.all([
      prisma.market.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
      prisma.market.count({ where }),
    ]);

    // Serialize BigInt fields to strings for JSON
    const serialized = markets.map(serializeMarket);

    res.json({
      data: serialized,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("[api] GET /api/markets error:", err);
    res.status(500).json({ error: "Failed to fetch markets" });
  }
});

/**
 * GET /api/markets/:id
 * Returns full market detail with resolution bundle if it exists.
 */
marketsRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid market ID" });
      return;
    }

    const market = await prisma.market.findUnique({
      where: { id },
      include: {
        resolution: true,
      },
    });

    if (!market) {
      res.status(404).json({ error: "Market not found" });
      return;
    }

    const serialized = {
      ...serializeMarket(market),
      resolution: market.resolution
        ? {
            marketId: market.resolution.marketId,
            outcome: market.resolution.outcome,
            includedEvidenceIds: market.resolution.includedEvidenceIds,
            resolver: market.resolution.resolver,
            rationaleUri: market.resolution.rationaleUri,
            resolvedAt: market.resolution.resolvedAt.toISOString(),
            disputed: market.resolution.disputed,
          }
        : null,
    };

    res.json({ data: serialized });
  } catch (err) {
    console.error("[api] GET /api/markets/:id error:", err);
    res.status(500).json({ error: "Failed to fetch market" });
  }
});

// -------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------

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
    resolutionBundle: m.resolutionBundle,
    metadataUri: m.metadataUri,
    createdAt: m.createdAt.toISOString(),
  };
}
