"use client";

import Link from "next/link";
import { MarketData } from "@/lib/api";
import OddsBar from "./OddsBar";
import { CATEGORY_LABELS } from "./CategoryFilter";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

function formatCountdown(expiry: number): string {
  const now = Date.now() / 1000;
  const diff = expiry - now;
  if (diff <= 0) return "Expired";
  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  if (days > 0) return `${days}d ${hours}h`;
  const mins = Math.floor((diff % 3600) / 60);
  return `${hours}h ${mins}m`;
}

function formatSol(lamports: number): string {
  return (lamports / LAMPORTS_PER_SOL).toFixed(2);
}

const STATE_COLORS: Record<string, string> = {
  Open: "bg-accent-green-dim text-accent-green",
  Closed: "bg-accent-yellow/20 text-accent-yellow",
  Resolving: "bg-accent-blue-dim text-accent-blue",
  Resolved: "bg-accent-purple/20 text-accent-purple",
  Disputed: "bg-accent-red-dim text-accent-red",
};

interface FeedCardProps {
  market: MarketData;
}

export default function FeedCard({ market }: FeedCardProps) {
  const volume = market.yesPool + market.noPool;
  const stateClass = STATE_COLORS[market.state] || STATE_COLORS.Open;

  return (
    <Link href={`/markets/${market.id}`}>
      <div className="card hover:border-border-hover hover:shadow-glow transition-all cursor-pointer group">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="text-text-primary font-semibold text-base leading-snug group-hover:text-accent-blue transition-colors line-clamp-2">
            {market.claimText || market.claimUri}
          </h3>
          <span className={`badge shrink-0 ${stateClass}`}>
            {market.state}
          </span>
        </div>

        <OddsBar yesPool={market.yesPool} noPool={market.noPool} />

        <div className="flex items-center justify-between mt-3 text-xs text-text-muted">
          <div className="flex items-center gap-3">
            <span className="badge bg-bg-tertiary text-text-secondary">
              {CATEGORY_LABELS[market.category] || "Other"}
            </span>
            <span>{formatSol(volume)} SOL volume</span>
          </div>
          <div className="flex items-center gap-3">
            <span>{market.evidenceCount} evidence</span>
            <span>{formatCountdown(market.expiry)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
