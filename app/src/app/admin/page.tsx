"use client";

import { useState, useEffect, useCallback } from "react";
import {
  fetchPendingMarkets,
  fetchEvidence,
  MarketData,
  EvidenceData,
} from "@/lib/api";
import { CATEGORY_LABELS } from "@/components/CategoryFilter";
import MarketReviewPanel from "@/components/MarketReviewPanel";
import ResolveForm from "@/components/ResolveForm";
import OddsBar from "@/components/OddsBar";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

export default function AdminPage() {
  const [markets, setMarkets] = useState<MarketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMarket, setSelectedMarket] = useState<MarketData | null>(
    null
  );
  const [evidence, setEvidence] = useState<EvidenceData[]>([]);
  const [evLoading, setEvLoading] = useState(false);

  const loadMarkets = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchPendingMarkets();
      setMarkets(data);
    } catch {
      setMarkets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMarkets();
  }, [loadMarkets]);

  async function selectMarket(market: MarketData) {
    setSelectedMarket(market);
    setEvLoading(true);
    try {
      const ev = await fetchEvidence(market.id);
      setEvidence(ev);
    } catch {
      setEvidence([]);
    } finally {
      setEvLoading(false);
    }
  }

  return (
    <div className="page-content">
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-text-primary">
          Resolver Dashboard
        </h1>
        <p className="text-text-muted mt-1">
          Review and resolve pending markets
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Market list */}
        <div className="lg:col-span-1 space-y-3">
          <h2 className="text-lg font-semibold text-text-primary">
            Pending Markets ({markets.length})
          </h2>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="card animate-pulse space-y-2">
                  <div className="h-4 bg-bg-tertiary rounded w-3/4" />
                  <div className="h-3 bg-bg-tertiary rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : markets.length === 0 ? (
            <div className="card text-center py-8 text-text-muted">
              No pending markets
            </div>
          ) : (
            <div className="space-y-2">
              {markets.map((m) => (
                <button
                  key={m.id}
                  onClick={() => selectMarket(m)}
                  className={`w-full text-left card transition-all ${
                    selectedMarket?.id === m.id
                      ? "border-accent-blue shadow-glow"
                      : "hover:border-border-hover"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-text-muted">
                      #{m.id}
                    </span>
                    <span className="badge bg-bg-tertiary text-text-secondary text-xs">
                      {CATEGORY_LABELS[m.category] || "Other"}
                    </span>
                  </div>
                  <p className="text-sm text-text-primary font-medium line-clamp-2">
                    {m.claimText || m.claimUri}
                  </p>
                  <div className="mt-2">
                    <OddsBar
                      yesPool={m.yesPool}
                      noPool={m.noPool}
                      height="h-1.5"
                      showLabels={false}
                    />
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-text-muted">
                    <span>
                      {((m.yesPool + m.noPool) / LAMPORTS_PER_SOL).toFixed(2)}{" "}
                      SOL
                    </span>
                    <span>{m.evidenceCount} evidence</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Review + Resolve panel */}
        <div className="lg:col-span-2 space-y-6">
          {selectedMarket ? (
            <>
              <div className="card">
                <h2 className="text-xl font-bold text-text-primary mb-2">
                  {selectedMarket.claimText || selectedMarket.claimUri}
                </h2>
                <OddsBar
                  yesPool={selectedMarket.yesPool}
                  noPool={selectedMarket.noPool}
                  height="h-4"
                />
                <div className="grid grid-cols-3 gap-4 mt-4 text-center text-sm">
                  <div>
                    <div className="font-bold text-accent-green">
                      {(
                        selectedMarket.yesPool / LAMPORTS_PER_SOL
                      ).toFixed(2)}
                    </div>
                    <div className="text-text-muted text-xs">Yes Pool</div>
                  </div>
                  <div>
                    <div className="font-bold text-text-primary">
                      {selectedMarket.evidenceCount}
                    </div>
                    <div className="text-text-muted text-xs">Evidence</div>
                  </div>
                  <div>
                    <div className="font-bold text-accent-red">
                      {(
                        selectedMarket.noPool / LAMPORTS_PER_SOL
                      ).toFixed(2)}
                    </div>
                    <div className="text-text-muted text-xs">No Pool</div>
                  </div>
                </div>
              </div>

              <MarketReviewPanel marketId={selectedMarket.id} />

              {evLoading ? (
                <div className="card animate-pulse space-y-3">
                  <div className="h-5 bg-bg-tertiary rounded w-1/3" />
                  <div className="h-4 bg-bg-tertiary rounded w-full" />
                </div>
              ) : (
                <ResolveForm
                  market={selectedMarket}
                  evidence={evidence}
                  onResolved={() => {
                    loadMarkets();
                    setSelectedMarket(null);
                  }}
                />
              )}
            </>
          ) : (
            <div className="card text-center py-16 text-text-muted">
              <p className="text-lg">Select a market to review</p>
              <p className="text-sm mt-1">
                Choose a pending market from the left panel
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
    </div>
  );
}
