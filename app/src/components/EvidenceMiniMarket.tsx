"use client";

interface EvidenceMiniMarketProps {
  includedPool: number;
  notIncludedPool: number;
}

export default function EvidenceMiniMarket({
  includedPool,
  notIncludedPool,
}: EvidenceMiniMarketProps) {
  const total = includedPool + notIncludedPool;
  const inclPct = total > 0 ? (includedPool / total) * 100 : 50;

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-accent-blue whitespace-nowrap">
        Inc {inclPct.toFixed(0)}%
      </span>
      <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-bg-secondary flex">
        <div
          className="bg-accent-blue transition-all"
          style={{ width: `${inclPct}%` }}
        />
        <div
          className="bg-accent-yellow transition-all"
          style={{ width: `${100 - inclPct}%` }}
        />
      </div>
      <span className="text-accent-yellow whitespace-nowrap">
        {(100 - inclPct).toFixed(0)}%
      </span>
    </div>
  );
}
