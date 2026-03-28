import "dotenv/config";
import express from "express";
import cors from "cors";
import { marketsRouter } from "./routes/markets";
import { evidenceRouter } from "./routes/evidence";
import { usersRouter } from "./routes/users";
import { feedRouter } from "./routes/feed";
import { adminRouter } from "./routes/admin";

const API_PORT = parseInt(process.env.API_PORT ?? "4000", 10);

const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Mount routes
app.use("/api/markets", marketsRouter);
app.use("/api/markets", evidenceRouter);
app.use("/api/users", usersRouter);
app.use("/api/feed", feedRouter);
app.use("/api/admin", adminRouter);

// Global error handler
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("[api] Unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
);

app.listen(API_PORT, () => {
  console.log(`[api] Listening on port ${API_PORT}`);
});

export default app;
