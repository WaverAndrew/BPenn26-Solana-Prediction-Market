"use client";

import { useEffect, useState, useCallback } from "react";
import { fetchMarket, MarketData } from "@/lib/api";

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
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { market, loading, error, refetch };
}
