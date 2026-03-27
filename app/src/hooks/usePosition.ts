"use client";

import { useEffect, useState, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { fetchPosition, PositionData } from "@/lib/api";

export function usePosition(marketId: number | undefined) {
  const { publicKey } = useWallet();
  const [position, setPosition] = useState<PositionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (marketId === undefined || !publicKey) {
      setPosition(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPosition(marketId, publicKey.toBase58());
      setPosition(data);
    } catch (e: any) {
      setError(e.message);
      setPosition(null);
    } finally {
      setLoading(false);
    }
  }, [marketId, publicKey]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { position, loading, error, refetch };
}
