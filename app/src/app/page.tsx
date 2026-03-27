"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchFeed, MarketData } from "@/lib/api";
import FeedList from "@/components/FeedList";
import CategoryFilter from "@/components/CategoryFilter";

export default function FeedPage() {
  const [markets, setMarkets] = useState<MarketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<number | undefined>(undefined);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchFeed(category);
      setMarkets(data.markets);
    } catch {
      setMarkets([]);
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Markets</h1>
          <p className="text-text-muted mt-1">
            Browse and trade on prediction markets
          </p>
        </div>
        <a href="/create" className="btn-primary shrink-0">
          + Create Market
        </a>
      </div>

      <CategoryFilter selected={category} onChange={setCategory} />

      <FeedList markets={markets} loading={loading} />
    </div>
  );
}
