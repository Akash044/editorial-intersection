import { Router } from "express";
import { prisma } from "../config/db";

const router = Router();

// GET /api/vocabulary?difficulty=advanced&date=2026-05-26&limit=50
router.get("/", async (req, res) => {
  const difficulty = req.query.difficulty as string | undefined;
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const dateStr = req.query.date as string | undefined;

  let dateFilter: { gte: Date; lt: Date } | undefined;
  if (dateStr) {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const start = new Date(d);
      start.setUTCHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setUTCDate(end.getUTCDate() + 1);
      dateFilter = { gte: start, lt: end };
    }
  }

  const words = await prisma.vocabulary.findMany({
    where: {
      ...(difficulty ? { difficulty } : {}),
      ...(dateFilter ? { createdAt: dateFilter } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      sentence: { include: { article: true } },
    },
  });

  res.json(
    words.map((v) => ({
      id: v.id,
      word: v.word,
      meaningBn: v.meaningBn,
      difficulty: v.difficulty,
      exampleSentence: v.exampleSentence,
      sourceSentence: v.sentence.original,
      articleTitle: v.sentence.article.title,
      articleSource: v.sentence.article.source,
      createdAt: v.createdAt,
    })),
  );
});

export default router;
