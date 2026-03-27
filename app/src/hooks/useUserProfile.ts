"use client";

import { useEffect, useState, useCallback } from "react";
import { fetchUserProfile, fetchUserPositions, UserProfileData, PositionData } from "@/lib/api";

export function useUserProfile(wallet: string | undefined) {
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [positions, setPositions] = useState<PositionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!wallet) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [p, pos] = await Promise.all([
        fetchUserProfile(wallet),
        fetchUserPositions(wallet),
      ]);
      setProfile(p);
      setPositions(pos);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [wallet]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { profile, positions, loading, error, refetch };
}
