import { Router } from "express";
import { runPipeline, getPipelineStatus } from "../jobs/scheduler";
import { prisma } from "../config/db";

const router = Router();

// POST /api/sync — fire-and-forget the pipeline. Returns immediately;
// poll GET /api/sync/status to watch progress.
router.post("/", async (_req, res) => {
  const status = getPipelineStatus();
  if (status.running) {
    return res.status(409).json({ status: "already_running", ...status });
  }
  res.json({ status: "started", at: new Date().toISOString() });
  runPipeline().catch((err) => console.error("[sync] failed:", err));
});

router.get("/status", async (_req, res) => {
  const status = getPipelineStatus();
  const lastArticle = await prisma.article.findFirst({
    where: { status: "processed" },
    orderBy: { fetchedAt: "desc" },
    select: { fetchedAt: true, source: true, title: true },
  });
  const articleCount = await prisma.article.count({ where: { status: "processed" } });
  const cacheCount = await prisma.sentenceCache.count();

  res.json({
    ...status,
    articleCount,
    cacheCount,
    lastArticle: lastArticle
      ? {
          fetchedAt: lastArticle.fetchedAt,
          source: lastArticle.source,
          title: lastArticle.title,
        }
      : null,
  });
});

export default router;
