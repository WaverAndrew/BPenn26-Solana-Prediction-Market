"use client";

interface OddsBarProps {
  yesPool: number;
  noPool: number;
  height?: string;
  showLabels?: boolean;
}

export default function OddsBar({
  yesPool,
  noPool,
  height = "h-3",
  showLabels = true,
}: OddsBarProps) {
  const total = yesPool + noPool;
  const yesPct = total > 0 ? (yesPool / total) * 100 : 50;
  const noPct = total > 0 ? (noPool / total) * 100 : 50;

  return (
    <div className="w-full">
      {showLabels && (
        <div className="flex justify-between text-xs font-medium mb-1.5">
          <span className="text-accent-green">
            Yes {yesPct.toFixed(1)}%
          </span>
          <span className="text-accent-red">
            No {noPct.toFixed(1)}%
          </span>
        </div>
      )}
      <div
        className={`w-full ${height} rounded-full overflow-hidden flex bg-bg-secondary`}
      >
        <div
          className="bg-accent-green transition-all duration-500 ease-out rounded-l-full"
          style={{ width: `${yesPct}%` }}
        />
        <div
          className="bg-accent-red transition-all duration-500 ease-out rounded-r-full"
          style={{ width: `${noPct}%` }}
        />
      </div>
    </div>
  );
}
