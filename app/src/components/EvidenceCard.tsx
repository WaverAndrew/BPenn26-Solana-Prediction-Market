"use client";

import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { EvidenceData } from "@/lib/api";
import EvidenceMiniMarket from "./EvidenceMiniMarket";

const SIDE_CONFIG: Record<string, { label: string; className: string }> = {
  Yes: { label: "YES", className: "badge-yes" },
  No: { label: "NO", className: "badge-no" },
  Neutral: { label: "NEUTRAL", className: "badge-neutral" },
};

const STATUS_COLORS: Record<string, string> = {
  Active: "text-accent-green",
  Challenged: "text-accent-yellow",
  Included: "text-accent-blue",
  Excluded: "text-text-muted",
  Slashed: "text-accent-red",
};

function shortAddr(addr: string): string {
  return addr.slice(0, 4) + "..." + addr.slice(-4);
}

interface EvidenceCardProps {
  evidence: EvidenceData;
  depth?: number;
}

export default function EvidenceCard({
  evidence,
  depth = 0,
}: EvidenceCardProps) {
  const side = SIDE_CONFIG[evidence.side] || SIDE_CONFIG.Neutral;
  const statusColor = STATUS_COLORS[evidence.status] || "text-text-muted";

  return (
    <div
      className={`border-l-2 ${
        evidence.side === "Yes"
          ? "border-accent-green/30"
          : evidence.side === "No"
          ? "border-accent-red/30"
          : "border-accent-blue/30"
      }`}
      style={{ marginLeft: depth > 0 ? "1rem" : 0 }}
    >
      <div className="card ml-3 mb-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className={side.className}>{side.label}</span>
            <span className={`text-xs ${statusColor}`}>
              {evidence.status}
            </span>
            <span className="text-xs text-text-muted">
              #{evidence.id}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <span>
              Bond: {(evidence.bondAmount / LAMPORTS_PER_SOL).toFixed(3)} SOL
            </span>
          </div>
        </div>

        <p className="text-sm text-text-primary mb-3 leading-relaxed">
          {evidence.contentText || evidence.contentUri}
        </p>

        <EvidenceMiniMarket
          includedPool={evidence.includedPool}
          notIncludedPool={evidence.notIncludedPool}
        />

        <div className="flex items-center justify-between mt-2 text-xs text-text-muted">
          <span>
            by{" "}
            <a
              href={`/profile/${evidence.author}`}
              className="text-accent-blue hover:underline"
            >
              {shortAddr(evidence.author)}
            </a>
          </span>
          <div className="flex items-center gap-3">
            <span>{evidence.supportCount} supports</span>
            <span>{evidence.challengeCount} challenges</span>
          </div>
        </div>
      </div>
    </div>
  );
}
