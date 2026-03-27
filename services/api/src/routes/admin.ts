import { Router, Request, Response } from "express";
import { prisma } from "../prisma";

export const adminRouter = Router();

const LLM_JUDGE_URL = process.env.LLM_JUDGE_URL ?? "http://localhost:3002";

/**
 * GET /api/admin/markets/pending
 * Returns markets in Open (0) or Closed (1) state that may need review.
 * Query params:
 *   - page (default 1)
 *   - limit (default 20, max 100)
 */
adminRouter.get("/markets/pending", async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const where = {
      state: { in: [0, 1] }, // Open = 0, Closed = 1
    };

    const [markets, total] = await Promise.all([
      prisma.market.findMany({
        where,
        orderBy: { expiry: "asc" },
        skip,
        take: limit,
        include: {
          _count: {
            select: { evidence: true },
          },
        },
      }),
      prisma.market.count({ where }),
    ]);

    const serialized = markets.map((m) => ({
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
      evidenceCount: m._count.evidence,
      metadataUri: m.metadataUri,
      createdAt: m.createdAt.toISOString(),
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
    console.error("[api] GET /api/admin/markets/pending error:", err);
    res.status(500).json({ error: "Failed to fetch pending markets" });
  }
});

/**
 * GET /api/admin/markets/:id/llm-review
 * Proxies a review request to the llm-judge service.
 * Returns the LLM's assessment of the market and its evidence.
 */
adminRouter.get("/markets/:id/llm-review", async (req: Request, res: Response) => {
  try {
    const marketId = parseInt(req.params.id);
    if (isNaN(marketId)) {
      res.status(400).json({ error: "Invalid market ID" });
      return;
    }

    // Verify market exists
    const market = await prisma.market.findUnique({
      where: { id: marketId },
    });

    if (!market) {
      res.status(404).json({ error: "Market not found" });
      return;
    }

    // Proxy to llm-judge service
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    try {
      const response = await fetch(`${LLM_JUDGE_URL}/review/${marketId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`[api] LLM judge returned ${response.status}: ${errorBody}`);
        res.status(response.status).json({
          error: "LLM review failed",
          detail: errorBody,
        });
        return;
      }

      const reviewData = await response.json();
      res.json({
        data: {
          marketId,
          review: reviewData,
        },
      });
    } finally {
      clearTimeout(timeout);
    }
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      res.status(504).json({ error: "LLM review request timed out" });
      return;
    }
    console.error("[api] GET /api/admin/markets/:id/llm-review error:", err);
    res.status(500).json({ error: "Failed to get LLM review" });
  }
});
