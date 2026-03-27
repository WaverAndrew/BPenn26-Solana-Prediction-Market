"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAnchorWallet, useWallet } from "@solana/wallet-adapter-react";
import { SystemProgram } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { getProgram } from "@/lib/program";
import { getConfigPda, getMarketPda, getVaultPda } from "@/lib/pda";
import { uploadToIpfs } from "@/lib/ipfs";
import { CATEGORY_LABELS } from "@/components/CategoryFilter";
import { getConnection } from "@/lib/program";

export default function CreateMarketPage() {
  const router = useRouter();
  const wallet = useAnchorWallet();
  const { publicKey, connected } = useWallet();

  const [claim, setClaim] = useState("");
  const [category, setCategory] = useState(0);
  const [expiryDate, setExpiryDate] = useState("");
  const [metadata, setMetadata] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!wallet || !publicKey) return;
    if (!claim.trim() || !expiryDate) {
      setError("Please fill in all required fields");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const program = getProgram(wallet);
      const connection = getConnection();
      const [configPda] = getConfigPda();

      // Fetch config to get current market_counter
      const configAccount = await connection.getAccountInfo(configPda);
      if (!configAccount) {
        throw new Error("Protocol not initialized. Config account not found.");
      }

      // Decode market_counter: skip 8 (discriminator) + 32 (admin) + 32 (fee_recipient) + 2 (fee_bps) = 74 bytes
      const counterOffset = 8 + 32 + 32 + 2;
      const marketCounter = configAccount.data.readBigUInt64LE(counterOffset);

      const [marketPda] = getMarketPda(marketCounter);
      const [vaultPda] = getVaultPda(marketCounter);

      // Upload claim text to IPFS
      const claimUri = await uploadToIpfs(claim);

      // Upload metadata if provided
      let metadataUri = "";
      if (metadata.trim()) {
        metadataUri = await uploadToIpfs(metadata);
      }

      const expiry = new BN(Math.floor(new Date(expiryDate).getTime() / 1000));

      await program.methods
        .createMarket(claimUri, category, expiry, metadataUri)
        .accounts({
          creator: publicKey,
          config: configPda,
          market: marketPda,
          marketVault: vaultPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      router.push(`/markets/${marketCounter}`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  // Default expiry: 7 days from now
  const defaultExpiry = new Date(Date.now() + 7 * 86400 * 1000)
    .toISOString()
    .slice(0, 16);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary">Create Market</h1>
        <p className="text-text-muted mt-1">
          Create a new prediction market with evidence-based resolution
        </p>
      </div>

      <div className="card space-y-6">
        {/* Claim text */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            Claim / Question *
          </label>
          <textarea
            value={claim}
            onChange={(e) => setClaim(e.target.value)}
            placeholder="e.g., Will Bitcoin exceed $100,000 by December 2026?"
            rows={3}
            className="input resize-none"
            maxLength={256}
          />
          <div className="text-xs text-text-muted mt-1 text-right">
            {claim.length}/256
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(parseInt(e.target.value))}
            className="input"
          >
            {Object.entries(CATEGORY_LABELS).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Expiry */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            Expiry Date *
          </label>
          <input
            type="datetime-local"
            value={expiryDate || defaultExpiry}
            onChange={(e) => setExpiryDate(e.target.value)}
            className="input"
          />
        </div>

        {/* Metadata */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            Additional Context (optional)
          </label>
          <textarea
            value={metadata}
            onChange={(e) => setMetadata(e.target.value)}
            placeholder="Provide additional context, resolution criteria, data sources..."
            rows={4}
            className="input resize-none"
          />
        </div>

        {/* Preview */}
        <div className="bg-bg-secondary rounded-lg p-4">
          <h3 className="text-sm font-medium text-text-muted mb-2">
            Preview
          </h3>
          <p className="text-text-primary font-semibold">
            {claim || "Your claim will appear here..."}
          </p>
          <div className="flex items-center gap-3 mt-2 text-xs text-text-muted">
            <span className="badge bg-bg-tertiary text-text-secondary">
              {CATEGORY_LABELS[category]}
            </span>
            {expiryDate && (
              <span>
                Expires{" "}
                {new Date(expiryDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            )}
          </div>
        </div>

        <button
          onClick={handleCreate}
          disabled={!connected || loading || !claim.trim()}
          className="btn-primary w-full py-3 text-base"
        >
          {loading
            ? "Creating market..."
            : !connected
            ? "Connect wallet to create"
            : "Create Market"}
        </button>

        {error && (
          <p className="text-accent-red text-sm break-all">{error}</p>
        )}
      </div>
    </div>
  );
}
