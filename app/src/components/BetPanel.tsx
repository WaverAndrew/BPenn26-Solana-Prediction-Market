"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { usePlaceBet } from "@/hooks/usePlaceBet";
import { MarketData } from "@/lib/api";

interface BetPanelProps {
  market: MarketData;
  onBetPlaced?: () => void;
}

export default function BetPanel({ market, onBetPlaced }: BetPanelProps) {
  const { connected } = useWallet();
  const { placeBet, loading, error, txSig } = usePlaceBet();
  const [outcome, setOutcome] = useState<0 | 1>(0);
  const [amount, setAmount] = useState("");

  const total = market.yesPool + market.noPool;
  const amountNum = parseFloat(amount) || 0;
  const amountLamports = Math.floor(amountNum * LAMPORTS_PER_SOL);

  // Estimate payout
  const currentPool =
    outcome === 0 ? market.yesPool : market.noPool;
  const oppositePool =
    outcome === 0 ? market.noPool : market.yesPool;
  const newMyPool = currentPool + amountLamports;
  const share = newMyPool > 0 ? amountLamports / newMyPool : 0;
  const potentialPayout =
    amountLamports > 0 ? share * (newMyPool + oppositePool) : 0;

  const canBet = market.state === "Open" && connected && amountNum > 0;

  async function handleBet() {
    const sig = await placeBet(market.id, outcome, amountNum);
    if (sig && onBetPlaced) onBetPlaced();
  }

  return (
    <div className="card space-y-4">
      <h3 className="text-lg font-semibold text-text-primary">Place a Bet</h3>

      {/* Yes / No toggle */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setOutcome(0)}
          className={`py-3 rounded-lg font-semibold text-sm transition-all ${
            outcome === 0
              ? "bg-accent-green text-black shadow-glow-green"
              : "bg-bg-tertiary text-text-secondary hover:bg-bg-hover"
          }`}
        >
          Yes
          {total > 0 && (
            <span className="ml-1.5 opacity-75">
              {((market.yesPool / total) * 100).toFixed(0)}%
            </span>
          )}
        </button>
        <button
          onClick={() => setOutcome(1)}
          className={`py-3 rounded-lg font-semibold text-sm transition-all ${
            outcome === 1
              ? "bg-accent-red text-white shadow-glow-red"
              : "bg-bg-tertiary text-text-secondary hover:bg-bg-hover"
          }`}
        >
          No
          {total > 0 && (
            <span className="ml-1.5 opacity-75">
              {((market.noPool / total) * 100).toFixed(0)}%
            </span>
          )}
        </button>
      </div>

      {/* Amount input */}
      <div>
        <label className="block text-sm text-text-muted mb-1.5">
          Amount (SOL)
        </label>
        <div className="relative">
          <input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="input pr-16"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">
            SOL
          </div>
        </div>
        <div className="flex gap-2 mt-2">
          {[0.1, 0.5, 1, 5].map((v) => (
            <button
              key={v}
              onClick={() => setAmount(v.toString())}
              className="flex-1 py-1.5 text-xs bg-bg-tertiary rounded-md text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-all"
            >
              {v} SOL
            </button>
          ))}
        </div>
      </div>

      {/* Potential payout */}
      {amountNum > 0 && (
        <div className="bg-bg-secondary rounded-lg p-3 space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-text-muted">Potential payout</span>
            <span className="text-text-primary font-medium">
              {(potentialPayout / LAMPORTS_PER_SOL).toFixed(4)} SOL
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-text-muted">Multiplier</span>
            <span className="text-text-primary font-medium">
              {amountNum > 0
                ? (potentialPayout / amountLamports).toFixed(2)
                : "-"}
              x
            </span>
          </div>
        </div>
      )}

      {/* Place bet button */}
      <button
        onClick={handleBet}
        disabled={!canBet || loading}
        className={`w-full py-3 rounded-lg font-semibold text-sm transition-all ${
          outcome === 0
            ? "bg-accent-green text-black hover:bg-accent-green/90 disabled:opacity-40"
            : "bg-accent-red text-white hover:bg-accent-red/90 disabled:opacity-40"
        } disabled:cursor-not-allowed`}
      >
        {loading
          ? "Confirming..."
          : !connected
          ? "Connect wallet to bet"
          : `Bet ${outcome === 0 ? "Yes" : "No"}${
              amountNum > 0 ? ` - ${amountNum} SOL` : ""
            }`}
      </button>

      {error && (
        <p className="text-accent-red text-sm break-all">{error}</p>
      )}
      {txSig && (
        <p className="text-accent-green text-sm break-all">
          Confirmed: {txSig.slice(0, 16)}...
        </p>
      )}
    </div>
  );
}
