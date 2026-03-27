import { Router, Request, Response } from "express";
import { prisma } from "../prisma";

export const evidenceRouter = Router();

interface EvidenceNode {
  id: number;
  marketId: number;
  parentEvidenceId: number | null;
  author: string;
  side: number;
  contentUri: string;
  contentHash: string;
  bondAmount: string;
  includedPool: string;
  notIncludedPool: string;
  supportCount: number;
  challengeCount: number;
  status: number;
  createdAt: string;
  children: EvidenceNode[];
}

/**
 * GET /api/markets/:id/evidence
 * Returns a threaded evidence tree for a market.
 * Query params:
 *   - flat=true  returns a flat list instead of a tree
 */
evidenceRouter.get("/:id/evidence", async (req: Request, res: Response) => {
  try {
    const marketId = parseInt(req.params.id);
    if (isNaN(marketId)) {
      res.status(400).json({ error: "Invalid market ID" });
      return;
    }

    const flat = req.query.flat === "true";

    const evidence = await prisma.evidence.findMany({
      where: { marketId },
      orderBy: { createdAt: "asc" },
    });

    const serialized = evidence.map((e) => ({
      id: e.id,
      marketId: e.marketId,
      parentEvidenceId: e.parentEvidenceId,
      author: e.author,
      side: e.side,
      contentUri: e.contentUri,
      contentHash: e.contentHash,
      bondAmount: e.bondAmount.toString(),
      includedPool: e.includedPool.toString(),
      notIncludedPool: e.notIncludedPool.toString(),
      supportCount: e.supportCount,
      challengeCount: e.challengeCount,
      status: e.status,
      createdAt: e.createdAt.toISOString(),
    }));

    if (flat) {
      res.json({ data: serialized });
      return;
    }

    // Build threaded tree
    const tree = buildEvidenceTree(serialized);
    res.json({ data: tree });
  } catch (err) {
    console.error("[api] GET /api/markets/:id/evidence error:", err);
    res.status(500).json({ error: "Failed to fetch evidence" });
  }
});

/**
 * Builds a parent-child tree from a flat list of evidence items.
 * Root items are those with parentEvidenceId === null.
 */
function buildEvidenceTree(
  items: Omit<EvidenceNode, "children">[]
): EvidenceNode[] {
  const nodeMap = new Map<number, EvidenceNode>();
  const roots: EvidenceNode[] = [];

  // Create nodes with empty children arrays
  for (const item of items) {
    nodeMap.set(item.id, { ...item, children: [] });
  }

  // Link children to parents
  for (const item of items) {
    const node = nodeMap.get(item.id)!;
    if (item.parentEvidenceId === null) {
      roots.push(node);
    } else {
      const parent = nodeMap.get(item.parentEvidenceId);
      if (parent) {
        parent.children.push(node);
      } else {
        // Orphan — treat as root
        roots.push(node);
      }
    }
  }

  return roots;
}
