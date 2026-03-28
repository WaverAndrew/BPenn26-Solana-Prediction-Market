"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useSubmitEvidence } from "@/hooks/useSubmitEvidence";
import { uploadToIpfs } from "@/lib/ipfs";

interface SubmitEvidenceFormProps {
  marketId: number;
  evidenceCount: number;
  onSubmitted?: () => void;
}

export default function SubmitEvidenceForm({
  marketId,
  evidenceCount,
  onSubmitted,
}: SubmitEvidenceFormProps) {
  const { connected } = useWallet();
  const { submitEvidence, loading, error, txSig } = useSubmitEvidence();

  const [side, setSide] = useState<0 | 1 | 2>(0);
  const [content, setContent] = useState("");
  const [parentId, setParentId] = useState("");
  const [bond, setBond] = useState("0.01");

  async function handleSubmit() {
    if (!content.trim()) return;

    // Upload content to IPFS
    const contentUri = await uploadToIpfs(content);

    // Create content hash (SHA-256)
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest(
      "SHA-256",
      encoder.encode(content) as unknown as ArrayBuffer
    );
    const contentHash = Array.from(new Uint8Array(hashBuffer));

    const pid = parentId ? parseInt(parentId) : null;
    const bondNum = parseFloat(bond) || 0.01;

    const sig = await submitEvidence(
      marketId,
      evidenceCount,
      side,
      contentUri,
      contentHash,
      pid,
      bondNum
    );

    if (sig) {
      setContent("");
      setParentId("");
      if (onSubmitted) onSubmitted();
    }
  }

  const sideOptions = [
    { value: 0 as const, label: "Yes", color: "bg-accent-green text-black" },
    { value: 1 as const, label: "No", color: "bg-accent-red text-white" },
    {
      value: 2 as const,
      label: "Neutral",
      color: "bg-accent-blue text-white",
    },
  ];

  return (
    <div className="card space-y-4">
      <h3 className="text-lg font-semibold text-text-primary">
        Submit Evidence
      </h3>

      {/* Side selection */}
      <div>
        <label className="block text-sm text-text-muted mb-1.5">Side</label>
        <div className="grid grid-cols-3 gap-2">
          {sideOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSide(opt.value)}
              className={`py-2 rounded-lg text-sm font-medium transition-all ${
                side === opt.value
                  ? opt.color
                  : "bg-bg-tertiary text-text-secondary hover:bg-bg-hover"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div>
        <label className="block text-sm text-text-muted mb-1.5">
          Evidence Content
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Provide your evidence or argument..."
          rows={4}
          className="input resize-none"
        />
      </div>

      {/* Parent ID (optional) */}
      <div>
        <label className="block text-sm text-text-muted mb-1.5">
          Reply to Evidence # (optional)
        </label>
        <input
          type="number"
          value={parentId}
          onChange={(e) => setParentId(e.target.value)}
          placeholder="Leave empty for top-level"
          className="input"
        />
      </div>

      {/* Bond */}
      <div>
        <label className="block text-sm text-text-muted mb-1.5">
          Bond (SOL) - min 0.01
        </label>
        <input
          type="number"
          step="0.01"
          min="0.01"
          value={bond}
          onChange={(e) => setBond(e.target.value)}
          className="input"
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={!connected || loading || !content.trim()}
        className="btn-primary w-full"
      >
        {loading
          ? "Submitting..."
          : !connected
          ? "Connect wallet"
          : "Submit Evidence"}
      </button>

      {error && (
        <p className="text-accent-red text-sm break-all">{error}</p>
      )}
      {txSig && (
        <p className="text-accent-green text-sm">
          Evidence submitted: {txSig.slice(0, 16)}...
        </p>
      )}
    </div>
  );
}
