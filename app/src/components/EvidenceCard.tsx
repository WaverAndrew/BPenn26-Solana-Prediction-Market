"use client";

import { useState } from "react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import { EvidenceData } from "@/lib/api";
import { useStakeEvidence } from "@/hooks/useStakeEvidence";

const SIDE_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; border: string }
> = {
  Yes: {
    label: "Supports YES",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
  },
  No: {
    label: "Supports NO",
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
  },
  Neutral: {
    label: "Neutral",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
  },
};

const STATUS_DOT: Record<string, string> = {
  Active: "bg-emerald-400",
  Challenged: "bg-amber-400",
  Included: "bg-blue-400",
  Excluded: "bg-gray-500",
  Slashed: "bg-red-500",
};

function shortAddr(addr: string) {
  return addr.slice(0, 4) + "…" + addr.slice(-4);
}

function fmtSol(lamports: number) {
  return (lamports / LAMPORTS_PER_SOL).toFixed(2);
}

interface Props {
  evidence: EvidenceData;
  depth?: number;
  onStaked?: () => void;
}

export default function EvidenceCard({ evidence, depth = 0, onStaked }: Props) {
  const { connected } = useWallet();
  const { stakeEvidence, loading, error, txSig } = useStakeEvidence();

  const [betSide, setBetSide] = useState<0 | 1 | null>(null); // 0=include, 1=exclude
  const [amount, setAmount] = useState(0.1);
  const [localIncPool, setLocalIncPool] = useState(evidence.includedPool);
  const [localExcPool, setLocalExcPool] = useState(evidence.notIncludedPool);

  const total = localIncPool + localExcPool;
  const incPct = total > 0 ? Math.round((localIncPool / total) * 100) : 50;
  const excPct = 100 - incPct;

  // Parimutuel payout preview: stake `amount` on `betSide`
  const amountLamports = Math.round(amount * LAMPORTS_PER_SOL);
  const myPool = betSide === 0 ? localIncPool : localExcPool;
  const newMyPool = myPool + amountLamports;
  const newTotal = total + amountLamports;
  const potentialPayout = newMyPool > 0 ? (amountLamports / newMyPool) * newTotal : 0;
  const multiplier = amountLamports > 0 ? potentialPayout / amountLamports : 0;

  const sideCfg = SIDE_CONFIG[evidence.side] ?? SIDE_CONFIG.Neutral;
  const dotColor = STATUS_DOT[evidence.status] ?? "bg-gray-500";

  async function handleStake(side: 0 | 1) {
    if (!connected) return;
    const sig = await stakeEvidence(evidence.marketId, evidence.id, side, amount);
    if (sig) {
      // Optimistic update
      const lamports = Math.round(amount * LAMPORTS_PER_SOL);
      if (side === 0) setLocalIncPool((p) => p + lamports);
      else setLocalExcPool((p) => p + lamports);
      setBetSide(null);
      onStaked?.();
    }
  }

  return (
    <div
      className={`relative ${depth > 0 ? "ml-6" : ""}`}
      style={depth > 0 ? { borderLeft: "2px solid rgba(255,255,255,0.07)", paddingLeft: "1rem" } : {}}
    >
      <div className="card mb-3 space-y-4">
        {/* ── Header row ── */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${sideCfg.bg} ${sideCfg.color} ${sideCfg.border}`}
            >
              {sideCfg.label}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-text-muted">
              <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
              {evidence.status}
            </span>
          </div>
          <div className="text-xs text-text-muted whitespace-nowrap shrink-0">
            Bond: {fmtSol(evidence.bondAmount)} SOL
          </div>
        </div>

        {/* ── Evidence content ── */}
        <p className="text-sm text-text-primary leading-relaxed">
          {evidence.contentText || evidence.contentUri}
        </p>

        {/* ── Mini-market: should this evidence be included? ── */}
        <div className="bg-bg-secondary rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-widest text-text-muted">
              Include in resolution?
            </span>
            <span className="text-[11px] text-text-muted">
              {fmtSol(total)} SOL staked
            </span>
          </div>

          {/* Odds bar */}
          <div>
            <div className="flex justify-between text-xs font-bold mb-1.5">
              <span className="text-blue-400">INCLUDE {incPct}%</span>
              <span className="text-amber-400">EXCLUDE {excPct}%</span>
            </div>
            <div className="h-2.5 rounded-full overflow-hidden bg-bg-primary flex">
              <div
                className="h-full bg-blue-500 transition-all duration-500"
                style={{ width: `${incPct}%` }}
              />
              <div
                className="h-full bg-amber-500 transition-all duration-500"
                style={{ width: `${excPct}%` }}
              />
            </div>
          </div>

          {/* Amount picker + bet buttons */}
          {betSide !== null ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-bold ${betSide === 0 ? "text-blue-400" : "text-amber-400"}`}>
                  {betSide === 0 ? "📥 Stake to INCLUDE" : "📤 Stake to EXCLUDE"}
                </span>
              </div>
              <div className="flex gap-1.5">
                {[0.05, 0.1, 0.5, 1].map((v) => (
                  <button
                    key={v}
                    onClick={() => setAmount(v)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-colors
                      ${amount === v
                        ? "bg-white text-black border-white"
                        : "bg-bg-primary text-text-secondary border-border-primary hover:border-border-hover"
                      }`}
                  >
                    {v} SOL
                  </button>
                ))}
              </div>
              {/* Payout preview */}
              <div className="flex items-center justify-between px-1 py-1.5 rounded-lg bg-bg-primary border border-border-primary text-xs">
                <span className="text-text-muted">Potential payout</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-text-primary">
                    {(potentialPayout / LAMPORTS_PER_SOL).toFixed(3)} SOL
                  </span>
                  <span className={`font-semibold ${multiplier >= 1.5 ? "text-emerald-400" : "text-text-muted"}`}>
                    {multiplier.toFixed(2)}x
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setBetSide(null)}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold text-text-muted bg-bg-primary border border-border-primary hover:border-border-hover transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!connected) {
                      alert("Connect your wallet first");
                      return;
                    }
                    handleStake(betSide);
                  }}
                  disabled={loading}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold text-white transition-colors disabled:opacity-50
                    ${betSide === 0 ? "bg-blue-600 hover:bg-blue-500" : "bg-amber-600 hover:bg-amber-500"}`}
                >
                  {loading
                    ? "Confirming…"
                    : !connected
                    ? "Connect wallet"
                    : `Confirm ${amount} SOL`}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => setBetSide(0)}
                className="flex-1 py-2 rounded-lg text-xs font-bold
                           bg-blue-500/15 text-blue-400 border border-blue-500/30
                           hover:bg-blue-500/25 hover:border-blue-400/50
                           transition-all"
              >
                📥 INCLUDE
              </button>
              <button
                onClick={() => setBetSide(1)}
                className="flex-1 py-2 rounded-lg text-xs font-bold
                           bg-amber-500/15 text-amber-400 border border-amber-500/30
                           hover:bg-amber-500/25 hover:border-amber-400/50
                           transition-all"
              >
                📤 EXCLUDE
              </button>
            </div>
          )}

          {error && <p className="text-red-400 text-xs break-all">{error}</p>}
          {txSig && (
            <p className="text-emerald-400 text-xs">
              ✅ Staked! {txSig.slice(0, 20)}…
            </p>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>
            by{" "}
            <a
              href={`/profile/${evidence.author}`}
              className="text-accent-blue hover:underline"
            >
              {shortAddr(evidence.author)}
            </a>
          </span>
          <div className="flex items-center gap-4">
            <span>👍 {evidence.supportCount}</span>
            <span>⚡ {evidence.challengeCount} challenges</span>
          </div>
        </div>
      </div>
    </div>
  );
}
