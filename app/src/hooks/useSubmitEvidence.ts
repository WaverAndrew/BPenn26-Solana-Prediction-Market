"use client";

import { useState, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useAnchorCompatibleWallet } from "@/hooks/useAnchorCompatibleWallet";
import { SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { getProgram } from "@/lib/program";
import {
  getConfigPda,
  getMarketPda,
  getEvidencePda,
  getEvidenceVaultPda,
} from "@/lib/pda";

export function useSubmitEvidence() {
  const wallet = useAnchorCompatibleWallet();
  const { publicKey } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txSig, setTxSig] = useState<string | null>(null);

  const submitEvidence = useCallback(
    async (
      marketId: number,
      evidenceCount: number,
      side: 0 | 1 | 2,
      contentUri: string,
      contentHash: number[],
      parentId: number | null,
      bondSol: number
    ) => {
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
        const [evidencePda] = getEvidencePda(marketId, evidenceCount);
        const [evidenceVaultPda] = getEvidenceVaultPda(
          marketId,
          evidenceCount
        );

        const bondLamports = new BN(Math.floor(bondSol * LAMPORTS_PER_SOL));

        const sig = await program.methods
          .submitEvidence(
            side,
            contentUri,
            contentHash,
            parentId,
            bondLamports
          )
          .accounts({
            author: publicKey,
            config: configPda,
            market: marketPda,
            evidence: evidencePda,
            evidenceVault: evidenceVaultPda,
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

  return { submitEvidence, loading, error, txSig };
}
