import Anthropic from "@anthropic-ai/sdk";
import fetch from "node-fetch";
import { Market, Evidence, EvidenceScore, Recommendation, MarketWithEvidence } from "./types";

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3001";

const anthropic = new Anthropic();

export async function fetchMarketData(marketId: string): Promise<MarketWithEvidence> {
  const marketRes = await fetch(`${API_BASE_URL}/markets/${marketId}`);
  if (!marketRes.ok) {
    throw new Error(`Failed to fetch market ${marketId}: ${marketRes.status} ${marketRes.statusText}`);
  }
  const market: Market = (await marketRes.json()) as Market;

  const evidenceRes = await fetch(`${API_BASE_URL}/markets/${marketId}/evidence`);
  if (!evidenceRes.ok) {
    throw new Error(`Failed to fetch evidence for market ${marketId}: ${evidenceRes.status} ${evidenceRes.statusText}`);
  }
  const evidence: Evidence[] = (await evidenceRes.json()) as Evidence[];

  return { market, evidence };
}

function buildPrompt(market: Market, evidence: Evidence[]): string {
  const evidenceBlock = evidence
    .map(
      (e, i) =>
        `### Evidence ${i + 1} (ID: ${e.id})
- **Source**: ${e.source}
- **Type**: ${e.type}
- **Submitted by**: ${e.submittedBy}
- **Submitted at**: ${e.submittedAt}
- **URL**: ${e.url || "N/A"}
- **Content**: ${e.content}`
    )
    .join("\n\n");

  return `You are an expert judge for a prediction market. Your job is to evaluate submitted evidence and produce a recommendation for market resolution.

## Market Details
- **Title**: ${market.title}
- **Description**: ${market.description}
- **Category**: ${market.category || "General"}
- **Created**: ${market.createdAt}
- **Resolution Date**: ${market.resolutionDate || "Not specified"}
- **Status**: ${market.status}
- **Current Odds**: Yes ${market.outcomes.yes}% / No ${market.outcomes.no}%

## Submitted Evidence
${evidenceBlock}

## Your Task
Evaluate each piece of evidence and provide an overall recommendation.

For EACH piece of evidence, assess:
1. **credibility** (0-100): How trustworthy is this source and content?
2. **relevance** (0-100): How directly does this relate to the market question?
3. **novelty** (0-100): How much new information does this add beyond other evidence?
4. **direction**: Does it "supports_yes", "supports_no", or is "neutral"?
5. **isDuplicate** (true/false): Is this substantially the same as another piece of evidence?
6. **duplicateOf**: If duplicate, the ID of the original evidence (or null).
7. **contradicts**: If this directly contradicts another piece, that evidence's ID (or null).
8. **reasoning**: Brief explanation of your assessment.

Then provide an overall recommendation:
- **recommendedOutcome**: "yes", "no", or "invalid" (if evidence is insufficient or market is poorly defined)
- **confidence** (0-100): Your confidence in this recommendation
- **includedEvidenceIds**: IDs of evidence you consider credible and relevant enough to include
- **rationale**: Detailed markdown explanation of your reasoning

Respond ONLY with valid JSON in this exact format:
{
  "evidenceScores": [
    {
      "evidenceId": "string",
      "credibility": number,
      "relevance": number,
      "novelty": number,
      "direction": "supports_yes" | "supports_no" | "neutral",
      "isDuplicate": boolean,
      "duplicateOf": "string or null",
      "contradicts": "string or null",
      "reasoning": "string"
    }
  ],
  "recommendation": {
    "recommendedOutcome": "yes" | "no" | "invalid",
    "confidence": number,
    "includedEvidenceIds": ["string"],
    "rationale": "string (markdown)"
  }
}`;
}

interface ClaudeEvidenceScore {
  evidenceId: string;
  credibility: number;
  relevance: number;
  novelty: number;
  direction: "supports_yes" | "supports_no" | "neutral";
  isDuplicate: boolean;
  duplicateOf: string | null;
  contradicts: string | null;
  reasoning: string;
}

interface ClaudeResponse {
  evidenceScores: ClaudeEvidenceScore[];
  recommendation: {
    recommendedOutcome: "yes" | "no" | "invalid";
    confidence: number;
    includedEvidenceIds: string[];
    rationale: string;
  };
}

function parseClaudeResponse(text: string): ClaudeResponse {
  // Strip markdown code fences if present
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
  }

  const parsed = JSON.parse(cleaned) as ClaudeResponse;

  // Validate structure
  if (!parsed.evidenceScores || !Array.isArray(parsed.evidenceScores)) {
    throw new Error("Missing or invalid evidenceScores array in response");
  }
  if (!parsed.recommendation || typeof parsed.recommendation !== "object") {
    throw new Error("Missing or invalid recommendation object in response");
  }

  return parsed;
}

export async function analyzeMarket(marketId: string): Promise<Recommendation> {
  const { market, evidence } = await fetchMarketData(marketId);

  if (evidence.length === 0) {
    return {
      marketId,
      recommendedOutcome: "invalid",
      confidence: 0,
      evidenceScores: [],
      includedEvidenceIds: [],
      rationale: "No evidence has been submitted for this market. Cannot make a recommendation.",
      analyzedAt: new Date().toISOString(),
    };
  }

  const prompt = buildPrompt(market, evidence);

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const textContent = message.content.find((block) => block.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text content in Claude response");
  }

  const parsed = parseClaudeResponse(textContent.text);

  const evidenceScores: EvidenceScore[] = parsed.evidenceScores.map((score) => ({
    evidenceId: score.evidenceId,
    credibility: score.credibility,
    relevance: score.relevance,
    novelty: score.novelty,
    direction: score.direction,
    isDuplicate: score.isDuplicate,
    duplicateOf: score.duplicateOf ?? undefined,
    contradicts: score.contradicts ?? undefined,
    reasoning: score.reasoning,
  }));

  const recommendation: Recommendation = {
    marketId,
    recommendedOutcome: parsed.recommendation.recommendedOutcome,
    confidence: parsed.recommendation.confidence,
    evidenceScores,
    includedEvidenceIds: parsed.recommendation.includedEvidenceIds,
    rationale: parsed.recommendation.rationale,
    analyzedAt: new Date().toISOString(),
  };

  return recommendation;
}
