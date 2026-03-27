import { Router, Request, Response } from "express";
import { prisma } from "../prisma";

export const usersRouter = Router();

/**
 * GET /api/users/:wallet
 * Returns user profile and karma for the given wallet address.
 */
usersRouter.get("/:wallet", async (req: Request, res: Response) => {
  try {
    const { wallet } = req.params;

    const profile = await prisma.userProfile.findUnique({
      where: { authority: wallet },
    });

    if (!profile) {
      res.status(404).json({ error: "User profile not found" });
      return;
    }

    res.json({
      data: {
        authority: profile.authority,
        forecastKarma: profile.forecastKarma.toString(),
        evidenceKarma: profile.evidenceKarma.toString(),
        reviewerKarma: profile.reviewerKarma.toString(),
        challengeKarma: profile.challengeKarma.toString(),
        totalKarma: (
          profile.forecastKarma +
          profile.evidenceKarma +
          profile.reviewerKarma +
          profile.challengeKarma
        ).toString(),
        penalties: profile.penalties,
        marketsCreated: profile.marketsCreated,
        betsPlaced: profile.betsPlaced,
        evidenceSubmitted: profile.evidenceSubmitted,
        createdAt: profile.createdAt.toISOString(),
      },
    });
  } catch (err) {
    console.error("[api] GET /api/users/:wallet error:", err);
    res.status(500).json({ error: "Failed to fetch user profile" });
  }
});

/**
 * GET /api/users/:wallet/positions
 * Returns all positions for a wallet with market details.
 * Query params:
 *   - page (default 1)
 *   - limit (default 20, max 100)
 *   - claimed: "true" | "false" (filter)
 */
usersRouter.get("/:wallet/positions", async (req: Request, res: Response) => {
  try {
    const { wallet } = req.params;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const where: { user: string; claimed?: boolean } = { user: wallet };

    if (req.query.claimed !== undefined) {
      where.claimed = req.query.claimed === "true";
    }

    const [positions, total] = await Promise.all([
      prisma.position.findMany({
        where,
        skip,
        take: limit,
        include: {
          market: {
            select: {
              id: true,
              claimUri: true,
              category: true,
              state: true,
              outcome: true,
              expiry: true,
            },
          },
        },
        orderBy: { market: { createdAt: "desc" } },
      }),
      prisma.position.count({ where }),
    ]);

    const serialized = positions.map((p) => ({
      marketId: p.marketId,
      user: p.user,
      yesAmount: p.yesAmount.toString(),
      noAmount: p.noAmount.toString(),
      claimed: p.claimed,
      market: {
        id: p.market.id,
        claimUri: p.market.claimUri,
        category: p.market.category,
        state: p.market.state,
        outcome: p.market.outcome,
        expiry: p.market.expiry.toISOString(),
      },
    }));

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
    console.error("[api] GET /api/users/:wallet/positions error:", err);
    res.status(500).json({ error: "Failed to fetch positions" });
  }
});
