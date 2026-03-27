"use client";

import { useState, useCallback } from "react";
import { useWallet, useAnchorWallet } from "@solana/wallet-adapter-react";
import { SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { getProgram } from "@/lib/program";
import {
  getConfigPda,
  getMarketPda,
  getVaultPda,
  getPositionPda,
} from "@/lib/pda";

export function usePlaceBet() {
  const wallet = useAnchorWallet();
  const { publicKey } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txSig, setTxSig] = useState<string | null>(null);

  const placeBet = useCallback(
    async (marketId: number, outcome: 0 | 1, amountSol: number) => {
      if (!wallet || !publicKey) {
        setError("Wallet not connected");
        return null;
      }

      setLoading(true);
      setError(null);
      setTxSig(null);

      try {
        const program = getProgram(wallet);
        const [configPda] = getConfigPda();
        const [marketPda] = getMarketPda(marketId);
        const [vaultPda] = getVaultPda(marketId);
        const [positionPda] = getPositionPda(marketId, publicKey);

        const amountLamports = new BN(
          Math.floor(amountSol * LAMPORTS_PER_SOL)
        );

        const sig = await program.methods
          .placeBet(outcome, amountLamports)
          .accounts({
            bettor: publicKey,
            config: configPda,
            market: marketPda,
            marketVault: vaultPda,
            position: positionPda,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        setTxSig(sig);
        return sig;
      } catch (e: any) {
        setError(e.message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [wallet, publicKey]
  );

  return { placeBet, loading, error, txSig };
}
