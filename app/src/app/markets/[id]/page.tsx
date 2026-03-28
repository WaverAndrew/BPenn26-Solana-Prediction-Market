"use client";

import { useParams } from "next/navigation";
import { useMarket } from "@/hooks/useMarket";
import { useEvidence } from "@/hooks/useEvidence";
import { usePosition } from "@/hooks/usePosition";
import MarketHeader from "@/components/MarketHeader";
import OddsBar from "@/components/OddsBar";
import BetPanel from "@/components/BetPanel";
import PositionSummary from "@/components/PositionSummary";
import EvidenceThread from "@/components/EvidenceThread";
import SubmitEvidenceForm from "@/components/SubmitEvidenceForm";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

export default function MarketDetailPage() {
  const params = useParams();
  const marketId = params?.id ? parseInt(params.id as string) : undefined;

  const { market, loading: mLoading, refetch: refetchMarket } = useMarket(marketId);
  const { tree, loading: eLoading, refetch: refetchEvidence } = useEvidence(marketId);
  const { position, refetch: refetchPosition } = usePosition(marketId);

  function handleUpdate() {
    refetchMarket();
    refetchPosition();
  }

  if (mLoading) {
    return (
      <div className="page-content">
      <div className="space-y-6">
        <div className="card animate-pulse space-y-4">
          <div className="h-4 bg-bg-tertiary rounded w-24" />
          <div className="h-8 bg-bg-tertiary rounded w-3/4" />
          <div className="h-4 bg-bg-tertiary rounded w-1/2" />
        </div>
      </div>
      </div>
    );
  }

  if (!market) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-semibold text-text-primary mb-2">
          Market not found
        </h2>
        <p className="text-text-muted">
          This market may not exist or the API is unavailable.
        </p>
      </div>
    );
  }

  const volume = market.yesPool + market.noPool;

  return (
    <div className="page-content">
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main content */}
      <div className="lg:col-span-2 space-y-6">
        <MarketHeader market={market} />

        {/* Odds + Volume stats */}
        <div className="card space-y-4">
          <OddsBar
            yesPool={market.yesPool}
            noPool={market.noPool}
            height="h-5"
          />
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-accent-green">
                {(market.yesPool / LAMPORTS_PER_SOL).toFixed(2)}
              </div>
              <div className="text-xs text-text-muted">Yes Pool (SOL)</div>
            </div>
            <div>
              <div className="text-lg font-bold text-text-primary">
                {(volume / LAMPORTS_PER_SOL).toFixed(2)}
              </div>
              <div className="text-xs text-text-muted">Total Volume (SOL)</div>
            </div>
            <div>
              <div className="text-lg font-bold text-accent-red">
                {(market.noPool / LAMPORTS_PER_SOL).toFixed(2)}
              </div>
              <div className="text-xs text-text-muted">No Pool (SOL)</div>
            </div>
          </div>
        </div>

        {/* Evidence thread */}
        <div>
          <h2 className="text-xl font-semibold text-text-primary mb-4">
            Evidence ({market.evidenceCount})
          </h2>
          {eLoading ? (
            <div className="card animate-pulse space-y-3">
              <div className="h-4 bg-bg-tertiary rounded w-full" />
              <div className="h-4 bg-bg-tertiary rounded w-3/4" />
            </div>
          ) : (
            <EvidenceThread tree={tree} onStaked={refetchEvidence} />
          )}
        </div>

        {/* Submit evidence */}
        {market.state === "Open" && (
          <SubmitEvidenceForm
            marketId={market.id}
            evidenceCount={market.evidenceCount}
            onSubmitted={() => {
              refetchEvidence();
              refetchMarket();
            }}
          />
        )}
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        <BetPanel market={market} onBetPlaced={handleUpdate} />
        <PositionSummary position={position} market={market} />
      </div>
    </div>
    </div>
  );
}
