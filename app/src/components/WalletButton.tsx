"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

const WalletMultiButton = dynamic(
  () => import("@solana/wallet-adapter-react-ui").then((m) => m.WalletMultiButton),
  { ssr: false }
);

export default function WalletButton() {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!publicKey || !connected) {
      setBalance(null);
      return;
    }

    let cancelled = false;

    async function fetchBalance() {
      try {
        const lamports = await connection.getBalance(publicKey!);
        if (!cancelled) setBalance(lamports / LAMPORTS_PER_SOL);
      } catch {
        // ignore
      }
    }

    fetchBalance();
    const id = setInterval(fetchBalance, 15_000); // refresh every 15s
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [publicKey, connected, connection]);

  return (
    <div className="flex items-center gap-2">
      {connected && balance !== null && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-secondary border border-border-primary">
          <span className="text-xs text-text-muted">◎</span>
          <span className="text-sm font-semibold text-text-primary tabular-nums">
            {balance.toFixed(3)}
          </span>
          <span className="text-xs text-text-muted">SOL</span>
        </div>
      )}
      <WalletMultiButton />
    </div>
  );
}
