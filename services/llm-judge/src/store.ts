import { Recommendation } from "./types";

const recommendations: Map<string, Recommendation> = new Map();

export function saveRecommendation(recommendation: Recommendation): void {
  recommendations.set(recommendation.marketId, recommendation);
}

export function getRecommendation(marketId: string): Recommendation | undefined {
  return recommendations.get(marketId);
}

export function getAllRecommendations(): Recommendation[] {
  return Array.from(recommendations.values());
}

export function deleteRecommendation(marketId: string): boolean {
  return recommendations.delete(marketId);
}
