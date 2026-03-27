"use client";

import { PositionData, MarketData } from "@/lib/api";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

interface PositionSummaryProps {
  position: PositionData | null;
  market: MarketData;
}

export default function PositionSummary({
  position,
  market,
}: PositionSummaryProps) {
  if (!position || (position.yesAmount === 0 && position.noAmount === 0)) {
    return null;
  }

  const total = market.yesPool + market.noPool;
  const yesShare =
    market.yesPool > 0 ? position.yesAmount / market.yesPool : 0;
  const noShare =
    market.noPool > 0 ? position.noAmount / market.noPool : 0;

  const yesPayout = total > 0 ? yesShare * total : 0;
  const noPayout = total > 0 ? noShare * total : 0;

  const totalInvested = position.yesAmount + position.noAmount;
  const bestPayout = Math.max(yesPayout, noPayout);
  const pnl = bestPayout - totalInvested;

  return (
    <div className="card space-y-3">
      <h3 className="text-lg font-semibold text-text-primary">
        Your Position
      </h3>

      <div className="grid grid-cols-2 gap-3">
        {position.yesAmount > 0 && (
          <div className="bg-accent-green-dim rounded-lg p-3">
            <div className="text-xs text-accent-green mb-1">Yes Position</div>
            <div className="text-lg font-bold text-accent-green">
              {(position.yesAmount / LAMPORTS_PER_SOL).toFixed(4)} SOL
            </div>
            <div className="text-xs text-text-muted mt-1">
              Payout if Yes: {(yesPayout / LAMPORTS_PER_SOL).toFixed(4)} SOL
            </div>
          </div>
        )}
        {position.noAmount > 0 && (
          <div className="bg-accent-red-dim rounded-lg p-3">
            <div className="text-xs text-accent-red mb-1">No Position</div>
            <div className="text-lg font-bold text-accent-red">
              {(position.noAmount / LAMPORTS_PER_SOL).toFixed(4)} SOL
            </div>
            <div className="text-xs text-text-muted mt-1">
              Payout if No: {(noPayout / LAMPORTS_PER_SOL).toFixed(4)} SOL
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between text-sm pt-2 border-t border-border-primary">
        <span className="text-text-muted">Best case P&L</span>
        <span
          className={`font-medium ${
            pnl >= 0 ? "text-accent-green" : "text-accent-red"
          }`}
        >
          {pnl >= 0 ? "+" : ""}
          {(pnl / LAMPORTS_PER_SOL).toFixed(4)} SOL
        </span>
      </div>

      {position.claimed && (
        <div className="badge bg-accent-purple/20 text-accent-purple">
          Settled
        </div>
      )}
    </div>
  );
}
