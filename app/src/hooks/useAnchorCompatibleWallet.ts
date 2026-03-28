"use client";

import { useMemo } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import type { AnchorWallet } from "@solana/wallet-adapter-react";

/**
 * `useAnchorWallet()` is often undefined right after connect even when `connected` is true,
 * so `getProgram()` never runs and no transaction is sent (only unrelated RPC like getBalance).
 * Build AnchorWallet from the adapter when signTransaction is available.
 */
export function useAnchorCompatibleWallet(): AnchorWallet | undefined {
  const { publicKey, signTransaction, signAllTransactions } = useWallet();

  return useMemo(() => {
    if (!publicKey || !signTransaction) return undefined;
    return {
      publicKey,
      signTransaction,
      signAllTransactions:
        signAllTransactions ??
        (async (txs) => {
          const out: typeof txs = [];
          for (const tx of txs) {
            out.push(await signTransaction(tx));
          }
          return out;
        }),
    };
  }, [publicKey, signTransaction, signAllTransactions]);
}
