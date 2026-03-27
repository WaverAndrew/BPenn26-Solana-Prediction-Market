"use client";

import { useEffect, useState } from "react";
import { LlmReview, fetchLlmReview } from "@/lib/api";

interface MarketReviewPanelProps {
  marketId: number;
}

export default function MarketReviewPanel({
  marketId,
}: MarketReviewPanelProps) {
  const [review, setReview] = useState<LlmReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchLlmReview(marketId)
      .then(setReview)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [marketId]);

  if (loading) {
    return (
      <div className="card animate-pulse space-y-3">
        <div className="h-5 bg-bg-tertiary rounded w-1/2" />
        <div className="h-4 bg-bg-tertiary rounded w-full" />
        <div className="h-4 bg-bg-tertiary rounded w-3/4" />
      </div>
    );
  }

  if (error || !review) {
    return (
      <div className="card">
        <h3 className="text-lg font-semibold text-text-primary mb-2">
          LLM Review
        </h3>
        <p className="text-text-muted text-sm">
          {error || "No review available yet. Request an LLM analysis."}
        </p>
      </div>
    );
  }

  const outcomeColors: Record<string, string> = {
    Yes: "text-accent-green",
    No: "text-accent-red",
    Invalid: "text-accent-yellow",
  };

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-text-primary">
          LLM Review
        </h3>
        <div className="flex items-center gap-2">
          <span
            className={`text-lg font-bold ${
              outcomeColors[review.recommendedOutcome] || "text-text-primary"
            }`}
          >
            {review.recommendedOutcome}
          </span>
          <span className="text-text-muted text-sm">
            ({(review.confidence * 100).toFixed(0)}% confidence)
          </span>
        </div>
      </div>

      {/* Confidence bar */}
      <div>
        <div className="w-full h-2 rounded-full bg-bg-secondary overflow-hidden">
          <div
            className="h-full bg-accent-blue rounded-full transition-all"
            style={{ width: `${review.confidence * 100}%` }}
          />
        </div>
      </div>

      {/* Summary */}
      <p className="text-sm text-text-secondary leading-relaxed">
        {review.summary}
      </p>

      {/* Evidence scores */}
      {review.evidenceScores.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-text-primary mb-2">
            Evidence Scores
          </h4>
          <div className="space-y-2">
            {review.evidenceScores.map((es) => (
              <div
                key={es.evidenceId}
                className="flex items-center justify-between bg-bg-secondary rounded-lg px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-muted">
                    #{es.evidenceId}
                  </span>
                  <span className="text-sm text-text-secondary truncate max-w-xs">
                    {es.rationale}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-16 h-1.5 rounded-full bg-bg-tertiary overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        es.score >= 0.7
                          ? "bg-accent-green"
                          : es.score >= 0.4
                          ? "bg-accent-yellow"
                          : "bg-accent-red"
                      }`}
                      style={{ width: `${es.score * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono text-text-muted w-8 text-right">
                    {(es.score * 100).toFixed(0)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
