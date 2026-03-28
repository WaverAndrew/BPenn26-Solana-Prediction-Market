"use client";

import { useEffect, useState, useCallback } from "react";
import { fetchMarket, MarketData } from "@/lib/api";
import { DEMO_MARKETS } from "@/lib/demo-data";

export function useMarket(id: number | undefined) {
  const [market, setMarket] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (id === undefined) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMarket(id);
      setMarket(data);
    } catch {
      // Fall back to demo data when API is offline
      const demo = DEMO_MARKETS.find((m) => m.id === id) ?? null;
      setMarket(demo);
      if (!demo) setError("Market not found");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { market, loading, error, refetch };
}
