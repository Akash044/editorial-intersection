import { Router } from "express";
import { prisma } from "../config/db";
import { runPipeline } from "../jobs/scheduler";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", time: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: "db_unavailable" });
  }
});

// Manual trigger for the daily pipeline. Useful during dev.
// In production, gate this behind an auth header before exposing publicly.
router.post("/run-pipeline", async (_req, res) => {
  res.json({ status: "started" });
  runPipeline().catch((err) => console.error("[health] pipeline failed:", err));
});

export default router;
