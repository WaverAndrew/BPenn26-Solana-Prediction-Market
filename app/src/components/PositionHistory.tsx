"use client";

import Link from "next/link";
import { PositionData } from "@/lib/api";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

interface PositionHistoryProps {
  positions: PositionData[];
}

export default function PositionHistory({ positions }: PositionHistoryProps) {
  if (positions.length === 0) {
    return (
      <div className="card text-center py-8 text-text-muted">
        No positions yet
      </div>
    );
  }

  return (
    <div className="card overflow-hidden p-0">
      <div className="px-5 py-4 border-b border-border-primary">
        <h3 className="text-lg font-semibold text-text-primary">
          Position History
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-primary text-text-muted">
              <th className="text-left px-5 py-3 font-medium">Market</th>
              <th className="text-right px-5 py-3 font-medium">Yes</th>
              <th className="text-right px-5 py-3 font-medium">No</th>
              <th className="text-right px-5 py-3 font-medium">Total</th>
              <th className="text-center px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {positions.map((pos) => {
              const total = pos.yesAmount + pos.noAmount;
              return (
                <tr
                  key={pos.marketId}
                  className="border-b border-border-primary hover:bg-bg-hover transition-colors"
                >
                  <td className="px-5 py-3">
                    <Link
                      href={`/markets/${pos.marketId}`}
                      className="text-accent-blue hover:underline"
                    >
                      Market #{pos.marketId}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-right font-mono">
                    {pos.yesAmount > 0 ? (
                      <span className="text-accent-green">
                        {(pos.yesAmount / LAMPORTS_PER_SOL).toFixed(4)}
                      </span>
                    ) : (
                      <span className="text-text-muted">-</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right font-mono">
                    {pos.noAmount > 0 ? (
                      <span className="text-accent-red">
                        {(pos.noAmount / LAMPORTS_PER_SOL).toFixed(4)}
                      </span>
                    ) : (
                      <span className="text-text-muted">-</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right font-mono text-text-primary">
                    {(total / LAMPORTS_PER_SOL).toFixed(4)}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span
                      className={`badge ${
                        pos.claimed
                          ? "bg-accent-purple/20 text-accent-purple"
                          : "bg-accent-green-dim text-accent-green"
                      }`}
                    >
                      {pos.claimed ? "Settled" : "Active"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
