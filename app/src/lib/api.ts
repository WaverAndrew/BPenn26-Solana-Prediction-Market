const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

async function fetchApi<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "Unknown error");
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json();
}

// -- Types --

export interface MarketData {
  id: number;
  creator: string;
  claimUri: string;
  claimText?: string;
  category: number;
  expiry: number;
  state: string;
  outcome: string;
  yesPool: number;
  noPool: number;
  evidenceCount: number;
  metadataUri: string;
  createdAt: number;
}

export interface EvidenceData {
  id: number;
  marketId: number;
  parentEvidenceId: number | null;
  author: string;
  side: string;
  contentUri: string;
  contentText?: string;
  bondAmount: number;
  includedPool: number;
  notIncludedPool: number;
  supportCount: number;
  challengeCount: number;
  status: string;
  createdAt: number;
  children?: EvidenceData[];
}

export interface PositionData {
  marketId: number;
  user: string;
  yesAmount: number;
  noAmount: number;
  claimed: boolean;
}

export interface UserProfileData {
  authority: string;
  forecastKarma: number;
  evidenceKarma: number;
  reviewerKarma: number;
  challengeKarma: number;
  penalties: number;
  marketsCreated: number;
  betsPlaced: number;
  evidenceSubmitted: number;
  createdAt: number;
}

export interface LlmReview {
  marketId: number;
  recommendedOutcome: string;
  confidence: number;
  evidenceScores: { evidenceId: number; score: number; rationale: string }[];
  summary: string;
}

// -- Endpoints --

export function fetchFeed(
  category?: number
): Promise<{ markets: MarketData[] }> {
  const q = category !== undefined ? `?category=${category}` : "";
  return fetchApi(`/api/feed${q}`);
}

export function fetchMarket(id: number): Promise<MarketData> {
  return fetchApi(`/api/markets/${id}`);
}

export function fetchEvidence(marketId: number): Promise<EvidenceData[]> {
  return fetchApi(`/api/markets/${marketId}/evidence`);
}

export function fetchPosition(
  marketId: number,
  wallet: string
): Promise<PositionData | null> {
  return fetchApi(`/api/markets/${marketId}/positions/${wallet}`);
}

export function fetchUserProfile(wallet: string): Promise<UserProfileData> {
  return fetchApi(`/api/profiles/${wallet}`);
}

export function fetchUserPositions(
  wallet: string
): Promise<PositionData[]> {
  return fetchApi(`/api/profiles/${wallet}/positions`);
}

export function fetchPendingMarkets(): Promise<MarketData[]> {
  return fetchApi(`/api/admin/pending`);
}

export function fetchLlmReview(marketId: number): Promise<LlmReview> {
  return fetchApi(`/api/admin/markets/${marketId}/review`);
}
