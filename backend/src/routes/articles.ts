import { Router } from "express";
import { prisma } from "../config/db";

const router = Router();

router.get("/", async (req, res) => {
  const dateStr = (req.query.date as string) || new Date().toISOString().split("T")[0];
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return res.status(400).json({ error: "invalid date" });
  }
  const start = new Date(date);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  const articles = await prisma.article.findMany({
    where: {
      publishedAt: { gte: start, lt: end },
      status: "processed",
    },
    orderBy: { publishedAt: "desc" },
    select: {
      id: true,
      source: true,
      title: true,
      url: true,
      publishedAt: true,
      _count: { select: { sentences: true } },
    },
  });

  res.json(
    articles.map((a) => ({
      id: a.id,
      source: a.source,
      title: a.title,
      url: a.url,
      publishedAt: a.publishedAt,
      sentenceCount: a._count.sentences,
    })),
  );
});

router.get("/latest", async (_req, res) => {
  const articles = await prisma.article.findMany({
    where: { status: "processed" },
    orderBy: { publishedAt: "desc" },
    take: 20,
    select: {
      id: true,
      source: true,
      title: true,
      url: true,
      publishedAt: true,
      _count: { select: { sentences: true } },
    },
  });
  res.json(
    articles.map((a) => ({
      id: a.id,
      source: a.source,
      title: a.title,
      url: a.url,
      publishedAt: a.publishedAt,
      sentenceCount: a._count.sentences,
    })),
  );
});

router.get("/:id/sentences", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "invalid id" });

  const sentences = await prisma.sentence.findMany({
    where: { articleId: id },
    orderBy: { position: "asc" },
    include: { vocabulary: true },
  });

  res.json(
    sentences.map((s) => ({
      id: s.id,
      position: s.position,
      original: s.original,
      translation: s.translation,
      grammar: JSON.parse(s.grammarJson),
      vocabulary: s.vocabulary.map((v) => ({
        id: v.id,
        word: v.word,
        meaningBn: v.meaningBn,
        difficulty: v.difficulty,
        exampleSentence: v.exampleSentence,
      })),
    })),
  );
});

export default router;
