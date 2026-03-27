"use client";

import { MarketData } from "@/lib/api";
import FeedCard from "./FeedCard";

interface FeedListProps {
  markets: MarketData[];
  loading: boolean;
}

export default function FeedList({ markets, loading }: FeedListProps) {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="card animate-pulse"
          >
            <div className="h-5 bg-bg-tertiary rounded w-3/4 mb-3" />
            <div className="h-3 bg-bg-tertiary rounded w-full mb-3" />
            <div className="h-3 bg-bg-tertiary rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (markets.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-3 opacity-30">---</div>
        <p className="text-text-muted text-lg">No markets found</p>
        <p className="text-text-muted text-sm mt-1">
          Try changing the filter or create a new market
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {markets.map((m) => (
        <FeedCard key={m.id} market={m} />
      ))}
    </div>
  );
}
