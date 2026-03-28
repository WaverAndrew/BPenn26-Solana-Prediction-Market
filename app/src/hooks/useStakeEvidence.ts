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
  getEvidenceStakePda,
} from "@/lib/pda";

export function useStakeEvidence() {
  const wallet = useAnchorCompatibleWallet();
  const { publicKey } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txSig, setTxSig] = useState<string | null>(null);

  const stakeEvidence = useCallback(
    async (
      marketId: number,
      evidenceId: number,
      side: 0 | 1,
      amountSol: number
    ) => {
      if (!wallet || !publicKey) {
        const msg =
          "Wallet not ready — unlock Phantom and try again, or reconnect.";
        setError(msg);
        console.warn("[useStakeEvidence]", msg, {
          hasWallet: !!wallet,
          hasPublicKey: !!publicKey,
        });
        return null;
      }

      setLoading(true);
      setError(null);
      setTxSig(null);

      try {
        const program = getProgram(wallet);
        const [configPda] = getConfigPda();
        const [marketPda] = getMarketPda(marketId);
        const [evidencePda] = getEvidencePda(marketId, evidenceId);
        const [evidenceVaultPda] = getEvidenceVaultPda(marketId, evidenceId);
        const [evidenceStakePda] = getEvidenceStakePda(
          marketId,
          evidenceId,
          publicKey
        );

        const amountLamports = new BN(
          Math.floor(amountSol * LAMPORTS_PER_SOL)
        );

        const sig = await program.methods
          .stakeEvidence(side, amountLamports)
          .accounts({
            staker: publicKey,
            config: configPda,
            market: marketPda,
            evidence: evidencePda,
            evidenceVault: evidenceVaultPda,
            evidenceStake: evidenceStakePda,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        setTxSig(sig);
        return sig;
      } catch (e: any) {
        const msg = e?.message ?? String(e);
        console.error("[useStakeEvidence] stake_evidence failed:", e);
        setError(msg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [wallet, publicKey]
  );

  return { stakeEvidence, loading, error, txSig };
}
