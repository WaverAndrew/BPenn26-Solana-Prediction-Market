import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { analyzeMarket } from "./analyzer";
import { saveRecommendation, getRecommendation } from "./store";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", service: "llm-judge", timestamp: new Date().toISOString() });
});

// Trigger analysis for a market
app.post("/judge/analyze/:marketId", async (req: Request, res: Response) => {
  const { marketId } = req.params;

  if (!marketId) {
    res.status(400).json({ error: "marketId is required" });
    return;
  }

  try {
    console.log(`[LLM Judge] Starting analysis for market ${marketId}`);
    const recommendation = await analyzeMarket(marketId);
    saveRecommendation(recommendation);
    console.log(
      `[LLM Judge] Analysis complete for market ${marketId}: ${recommendation.recommendedOutcome} (confidence: ${recommendation.confidence})`
    );
    res.json(recommendation);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[LLM Judge] Analysis failed for market ${marketId}:`, message);
    res.status(500).json({ error: "Analysis failed", details: message });
  }
});

// Get latest recommendation for a market
app.get("/judge/recommendation/:marketId", (req: Request, res: Response) => {
  const { marketId } = req.params;

  if (!marketId) {
    res.status(400).json({ error: "marketId is required" });
    return;
  }

  const recommendation = getRecommendation(marketId);
  if (!recommendation) {
    res.status(404).json({ error: "No recommendation found for this market" });
    return;
  }

  res.json(recommendation);
});

app.listen(PORT, () => {
  console.log(`[LLM Judge] Service running on port ${PORT}`);
  console.log(`[LLM Judge] API base URL: ${process.env.API_BASE_URL || "http://localhost:3001"}`);
});
