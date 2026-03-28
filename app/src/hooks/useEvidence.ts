"use client";

import { useEffect, useState, useCallback } from "react";
import { fetchEvidence, EvidenceData } from "@/lib/api";
import { DEMO_EVIDENCE } from "@/lib/demo-data";

function buildTree(items: EvidenceData[]): EvidenceData[] {
  const map = new Map<number, EvidenceData>();
  const roots: EvidenceData[] = [];

  for (const item of items) {
    map.set(item.id, { ...item, children: [] });
  }

  for (const item of items) {
    const node = map.get(item.id)!;
    if (item.parentEvidenceId !== null) {
      const parent = map.get(item.parentEvidenceId);
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(node);
        continue;
      }
    }
    roots.push(node);
  }

  return roots;
}

export function useEvidence(marketId: number | undefined) {
  const [evidence, setEvidence] = useState<EvidenceData[]>([]);
  const [tree, setTree] = useState<EvidenceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (marketId === undefined) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchEvidence(marketId);
      setEvidence(data);
      setTree(buildTree(data));
    } catch {
      // Fall back to demo data when API is offline
      const demo = DEMO_EVIDENCE[marketId] ?? [];
      setEvidence(demo);
      setTree(buildTree(demo));
    } finally {
      setLoading(false);
    }
  }, [marketId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { evidence, tree, loading, error, refetch };
}
