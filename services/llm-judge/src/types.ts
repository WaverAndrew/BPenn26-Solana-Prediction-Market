export interface Market {
  id: string;
  title: string;
  description: string;
  category?: string;
  createdAt: string;
  resolutionDate?: string;
  status: "open" | "closed" | "resolved";
  outcomes: {
    yes: number;
    no: number;
  };
}

export interface Evidence {
  id: string;
  marketId: string;
  source: string;
  content: string;
  url?: string;
  submittedBy: string;
  submittedAt: string;
  type: "article" | "data" | "official" | "social" | "other";
}

export interface EvidenceScore {
  evidenceId: string;
  credibility: number;
  relevance: number;
  novelty: number;
  direction: "supports_yes" | "supports_no" | "neutral";
  isDuplicate: boolean;
  duplicateOf?: string;
  contradicts?: string;
  reasoning: string;
}

export interface Recommendation {
  marketId: string;
  recommendedOutcome: "yes" | "no" | "invalid";
  confidence: number;
  evidenceScores: EvidenceScore[];
  includedEvidenceIds: string[];
  rationale: string;
  analyzedAt: string;
}

export interface MarketWithEvidence {
  market: Market;
  evidence: Evidence[];
}
