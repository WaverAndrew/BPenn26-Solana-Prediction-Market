"use client";

import { useState } from "react";
import { useAnchorWallet, useWallet } from "@solana/wallet-adapter-react";
import { SystemProgram } from "@solana/web3.js";
import { getProgram } from "@/lib/program";
import {
  getConfigPda,
  getMarketPda,
  getResolutionPda,
} from "@/lib/pda";
import { MarketData, EvidenceData } from "@/lib/api";
import { uploadToIpfs } from "@/lib/ipfs";

interface ResolveFormProps {
  market: MarketData;
  evidence: EvidenceData[];
  onResolved?: () => void;
}

export default function ResolveForm({
  market,
  evidence,
  onResolved,
}: ResolveFormProps) {
  const wallet = useAnchorWallet();
  const { publicKey, connected } = useWallet();
  const [outcome, setOutcome] = useState<0 | 1 | 2>(0);
  const [includedIds, setIncludedIds] = useState<Set<number>>(new Set());
  const [rationale, setRationale] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"bundle" | "resolve">("bundle");

  function toggleEvidence(id: number) {
    setIncludedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleCreateBundle() {
    if (!wallet || !publicKey) return;
    setLoading(true);
    setError(null);
    try {
      const program = getProgram(wallet);
      const [configPda] = getConfigPda();
      const [marketPda] = getMarketPda(market.id);
      const [resolutionPda] = getResolutionPda(market.id);

      const rationaleUri = await uploadToIpfs(rationale || "No rationale provided");

      await program.methods
        .createResolutionBundle(
          outcome,
          Array.from(includedIds),
          rationaleUri
        )
        .accounts({
          admin: publicKey,
          config: configPda,
          market: marketPda,
          resolutionBundle: resolutionPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      setStep("resolve");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleResolve() {
    if (!wallet || !publicKey) return;
    setLoading(true);
    setError(null);
    try {
      const program = getProgram(wallet);
      const [configPda] = getConfigPda();
      const [marketPda] = getMarketPda(market.id);
      const [resolutionPda] = getResolutionPda(market.id);

      await program.methods
        .resolveMarket()
        .accounts({
          admin: publicKey,
          config: configPda,
          market: marketPda,
          resolutionBundle: resolutionPda,
        })
        .rpc();

      if (onResolved) onResolved();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const outcomeOptions = [
    { value: 0 as const, label: "Yes", color: "bg-accent-green text-black" },
    { value: 1 as const, label: "No", color: "bg-accent-red text-white" },
    { value: 2 as const, label: "Invalid", color: "bg-accent-yellow text-black" },
  ];

  return (
    <div className="card space-y-4">
      <h3 className="text-lg font-semibold text-text-primary">
        {step === "bundle" ? "Create Resolution" : "Finalize Resolution"}
      </h3>

      {step === "bundle" ? (
        <>
          {/* Outcome selection */}
          <div>
            <label className="block text-sm text-text-muted mb-1.5">
              Outcome
            </label>
            <div className="grid grid-cols-3 gap-2">
              {outcomeOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setOutcome(opt.value)}
                  className={`py-2 rounded-lg text-sm font-medium transition-all ${
                    outcome === opt.value
                      ? opt.color
                      : "bg-bg-tertiary text-text-secondary hover:bg-bg-hover"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Evidence selection */}
          <div>
            <label className="block text-sm text-text-muted mb-1.5">
              Include Evidence ({includedIds.size} selected)
            </label>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {evidence.map((ev) => (
                <label
                  key={ev.id}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                    includedIds.has(ev.id)
                      ? "bg-accent-blue-dim border border-accent-blue/30"
                      : "bg-bg-secondary hover:bg-bg-hover"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={includedIds.has(ev.id)}
                    onChange={() => toggleEvidence(ev.id)}
                    className="rounded border-border-primary"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-text-muted">
                        #{ev.id}
                      </span>
                      <span
                        className={`badge text-xs ${
                          ev.side === "Yes"
                            ? "badge-yes"
                            : ev.side === "No"
                            ? "badge-no"
                            : "badge-neutral"
                        }`}
                      >
                        {ev.side}
                      </span>
                    </div>
                    <p className="text-sm text-text-secondary truncate mt-1">
                      {ev.contentText || ev.contentUri}
                    </p>
                  </div>
                </label>
              ))}
              {evidence.length === 0 && (
                <p className="text-text-muted text-sm py-2">
                  No evidence to include
                </p>
              )}
            </div>
          </div>

          {/* Rationale */}
          <div>
            <label className="block text-sm text-text-muted mb-1.5">
              Rationale
            </label>
            <textarea
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              placeholder="Explain the resolution reasoning..."
              rows={3}
              className="input resize-none"
            />
          </div>

          <button
            onClick={handleCreateBundle}
            disabled={!connected || loading}
            className="btn-primary w-full"
          >
            {loading ? "Creating bundle..." : "Create Resolution Bundle"}
          </button>
        </>
      ) : (
        <>
          <p className="text-text-secondary text-sm">
            Resolution bundle created. Click below to finalize the market
            resolution. This action is irreversible.
          </p>
          <button
            onClick={handleResolve}
            disabled={!connected || loading}
            className="btn-primary w-full bg-accent-purple hover:bg-accent-purple/90"
          >
            {loading ? "Resolving..." : "Finalize Resolution"}
          </button>
        </>
      )}

      {error && (
        <p className="text-accent-red text-sm break-all">{error}</p>
      )}
    </div>
  );
}
