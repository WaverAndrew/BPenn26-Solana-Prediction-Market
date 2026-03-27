"use client";

import { MarketData } from "@/lib/api";
import { CATEGORY_LABELS } from "./CategoryFilter";

const STATE_COLORS: Record<string, string> = {
  Open: "bg-accent-green-dim text-accent-green",
  Closed: "bg-accent-yellow/20 text-accent-yellow",
  Resolving: "bg-accent-blue-dim text-accent-blue",
  Resolved: "bg-accent-purple/20 text-accent-purple",
  Disputed: "bg-accent-red-dim text-accent-red",
};

const OUTCOME_LABELS: Record<string, string> = {
  Undecided: "Pending",
  Yes: "Resolved YES",
  No: "Resolved NO",
  Invalid: "Invalid",
};

function shortAddr(addr: string): string {
  return addr.slice(0, 4) + "..." + addr.slice(-4);
}

function formatDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface MarketHeaderProps {
  market: MarketData;
}

export default function MarketHeader({ market }: MarketHeaderProps) {
  const stateClass = STATE_COLORS[market.state] || STATE_COLORS.Open;
  const isExpired = market.expiry * 1000 < Date.now();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`badge ${stateClass}`}>{market.state}</span>
        <span className="badge bg-bg-tertiary text-text-secondary">
          {CATEGORY_LABELS[market.category] || "Other"}
        </span>
        {market.outcome !== "Undecided" && (
          <span
            className={`badge ${
              market.outcome === "Yes"
                ? "bg-accent-green-dim text-accent-green"
                : market.outcome === "No"
                ? "bg-accent-red-dim text-accent-red"
                : "bg-accent-yellow/20 text-accent-yellow"
            }`}
          >
            {OUTCOME_LABELS[market.outcome]}
          </span>
        )}
      </div>

      <h1 className="text-2xl md:text-3xl font-bold text-text-primary leading-tight">
        {market.claimText || market.claimUri}
      </h1>

      <div className="flex flex-wrap items-center gap-4 text-sm text-text-muted">
        <span>
          Created by{" "}
          <a
            href={`/profile/${market.creator}`}
            className="text-accent-blue hover:underline"
          >
            {shortAddr(market.creator)}
          </a>
        </span>
        <span className="w-1 h-1 rounded-full bg-text-muted" />
        <span>Created {formatDate(market.createdAt)}</span>
        <span className="w-1 h-1 rounded-full bg-text-muted" />
        <span className={isExpired ? "text-accent-red" : ""}>
          {isExpired ? "Expired" : `Expires ${formatDate(market.expiry)}`}
        </span>
      </div>
    </div>
  );
}
