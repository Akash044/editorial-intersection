import crypto from "crypto";
import { GoogleGenAI, Type } from "@google/genai";
import { prisma } from "../config/db";
import { env } from "../config/env";
import { IAnalyzedSentence, IRawArticle, IVocabItem } from "../types/pipeline";

function cacheHash(model: string, sentence: string): string {
  return crypto
    .createHash("sha256")
    .update(`${model}:${sentence.trim()}`)
    .digest("hex");
}

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

// Models tried in order. When the active model's daily free-tier quota is
// exhausted (429), the pipeline falls back to the next one for the rest of the
// run instead of failing. Reset to the primary at the start of each run so a
// freshly-reset daily quota is picked up automatically.
const MODEL_CHAIN = Array.from(new Set([env.GEMINI_MODEL, ...env.GEMINI_FALLBACK_MODELS]));
let activeModel = MODEL_CHAIN[0];

export function resetActiveModel(): void {
  activeModel = MODEL_CHAIN[0];
}
export function getActiveModel(): string {
  return activeModel;
}
export function getModelChain(): string[] {
  return [...MODEL_CHAIN];
}
function nextModel(current: string): string | null {
  const i = MODEL_CHAIN.indexOf(current);
  return i >= 0 && i + 1 < MODEL_CHAIN.length ? MODEL_CHAIN[i + 1] : null;
}

const SYSTEM_INSTRUCTION = `You are a language analysis assistant for native Bengali (Bangla) speakers learning English by reading editorials from English-language newspapers.

For every English sentence you receive, return a single JSON object matching the provided schema. Be accurate, concise, and pedagogical.

Translation: produce a natural Bengali (Bangla) translation — not a word-for-word gloss.

Grammar: identify the main subject, verb, and object. Use empty string if a part doesn't apply (e.g. intransitive verbs have no object). Provide tense (e.g. "simple present", "present perfect") and sentenceType ("simple" | "compound" | "complex" | "compound-complex"). The breakdown should be 1-2 sentences of plain-English grammar explanation.

Vocabulary: pick 0-3 words a Bengali intermediate-to-advanced learner is most likely to find unfamiliar. Skip trivially common words. Provide the Bengali meaning and a fresh example sentence (not the original). Return empty array if nothing notable.`;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    translation: { type: Type.STRING },
    grammar: {
      type: Type.OBJECT,
      properties: {
        subject: { type: Type.STRING },
        verb: { type: Type.STRING },
        object: { type: Type.STRING },
        tense: { type: Type.STRING },
        sentenceType: { type: Type.STRING },
        breakdown: { type: Type.STRING },
      },
      required: ["subject", "verb", "object", "tense", "sentenceType", "breakdown"],
    },
    vocabulary: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          word: { type: Type.STRING },
          meaning: { type: Type.STRING },
          difficulty: {
            type: Type.STRING,
            enum: ["beginner", "intermediate", "advanced"],
          },
          example: { type: Type.STRING },
        },
        required: ["word", "meaning", "difficulty", "example"],
      },
    },
  },
  required: ["translation", "grammar", "vocabulary"],
};

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function parseRetryDelaySeconds(err: unknown): number | null {
  const msg = err instanceof Error ? err.message : String(err);
  // The Gemini SDK surfaces the RetryInfo as "Please retry in 13.7s" or "retryDelay":"13s"
  const m = msg.match(/retry in (\d+(?:\.\d+)?)\s*s/i) ?? msg.match(/"retryDelay":\s*"(\d+)s"/);
  return m ? Math.ceil(Number(m[1])) : null;
}

function is429(err: unknown): boolean {
  const m = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return (
    m.includes("429") ||
    m.includes("resource_exhausted") ||
    m.includes("too many requests") ||
    m.includes("exceeded your current quota")
  );
}

// Distinguishes a per-day quota exhaustion (switch model — same model is useless
// until tomorrow) from a per-minute throttle (back off and retry same model).
function isDailyQuota(err: unknown): boolean {
  const m = err instanceof Error ? err.message : String(err);
  return /per\s*day|perday|requests per day|GenerateRequestsPerDay/i.test(m);
}

async function analyzeSentence(sentence: string): Promise<IAnalyzedSentence> {
  let rateLimitRetries = 0;
  const maxRateLimitRetries = 2;

  // Loop is bounded: each daily-quota switch advances along MODEL_CHAIN (finite,
  // nextModel() returns null at the end) and per-minute retries are capped.
  while (true) {
    const model = activeModel;
    const hash = cacheHash(model, sentence);

    // Cache hit — skip the Gemini call entirely. Cuts cost to zero on re-syncs.
    const cached = await prisma.sentenceCache.findUnique({ where: { hash } });
    if (cached) {
      await prisma.sentenceCache.update({
        where: { hash },
        data: { hitCount: { increment: 1 }, lastUsedAt: new Date() },
      });
      return {
        translation: cached.translation,
        grammar: JSON.parse(cached.grammarJson),
        vocabulary: JSON.parse(cached.vocabularyJson),
      };
    }

    try {
      const response = await ai.models.generateContent({
        model,
        contents: `Sentence: "${sentence}"`,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
          temperature: 0.2,
        },
      });
      const text = response.text;
      if (!text) throw new Error("no text in Gemini response");
      const parsed = JSON.parse(text) as IAnalyzedSentence;
      if (!parsed.translation || !parsed.grammar) throw new Error("invalid analysis shape");
      parsed.vocabulary = parsed.vocabulary ?? [];

      // Persist to cache for next time. Use upsert in case two concurrent
      // pipeline runs raced on the same sentence. Cache is keyed by model, so
      // each model builds its own cache.
      await prisma.sentenceCache.upsert({
        where: { hash },
        update: { lastUsedAt: new Date() },
        create: {
          hash,
          model,
          sentence,
          translation: parsed.translation,
          grammarJson: JSON.stringify(parsed.grammar),
          vocabularyJson: JSON.stringify(parsed.vocabulary),
        },
      });

      return parsed;
    } catch (err) {
      if (is429(err)) {
        const fallback = nextModel(model);
        // Daily quota gone — same model is useless until reset; switch now.
        if (isDailyQuota(err) && fallback) {
          console.warn(`[processor] ${model} daily quota exhausted — switching to ${fallback}`);
          activeModel = fallback;
          rateLimitRetries = 0;
          continue;
        }
        // Per-minute throttle — back off (cap 60s) and retry the same model.
        if (rateLimitRetries < maxRateLimitRetries) {
          rateLimitRetries++;
          const wait = Math.min(parseRetryDelaySeconds(err) ?? 5, 60) * 1000;
          console.warn(`[processor] 429 on ${model} — sleeping ${wait}ms (retry ${rateLimitRetries})`);
          await sleep(wait);
          continue;
        }
        // Out of per-minute retries — fall back to the next model if any.
        if (fallback) {
          console.warn(`[processor] ${model} still rate-limited — switching to ${fallback}`);
          activeModel = fallback;
          rateLimitRetries = 0;
          continue;
        }
      }
      throw err;
    }
  }
}

export async function processArticles(articles: IRawArticle[]): Promise<IVocabItem[]> {
  // Start each run from the primary model so a daily quota reset is picked up.
  resetActiveModel();
  console.log(`[processor] model chain: ${MODEL_CHAIN.join(" -> ")}`);
  const collectedVocab: IVocabItem[] = [];

  for (const article of articles) {
    const dbArticle = await prisma.article.upsert({
      where: { url: article.url },
      update: { title: article.title, source: article.source, publishedAt: article.publishedAt },
      create: {
        source: article.source,
        title: article.title,
        url: article.url,
        publishedAt: article.publishedAt,
      },
    });

    if (dbArticle.status === "processed") {
      console.log(`[processor] skip already-processed ${article.url}`);
      continue;
    }

    try {
      await prisma.sentence.deleteMany({ where: { articleId: dbArticle.id } });

      for (let i = 0; i < article.sentences.length; i++) {
        const sentence = article.sentences[i];
        try {
          const analysis = await analyzeSentence(sentence);
          await prisma.sentence.create({
            data: {
              articleId: dbArticle.id,
              position: i,
              original: sentence,
              translation: analysis.translation,
              grammarJson: JSON.stringify(analysis.grammar),
              vocabulary: {
                create: analysis.vocabulary.map((v) => ({
                  word: v.word,
                  meaningBn: v.meaning,
                  difficulty: v.difficulty,
                  exampleSentence: v.example,
                })),
              },
            },
          });
          collectedVocab.push(...analysis.vocabulary);
        } catch (err) {
          console.warn(`[processor] sentence failed:`, (err as Error).message);
        }
      }

      await prisma.article.update({
        where: { id: dbArticle.id },
        data: { status: "processed" },
      });
      console.log(`[processor] processed ${article.url}`);
    } catch (err) {
      await prisma.article.update({
        where: { id: dbArticle.id },
        data: { status: "failed" },
      });
      console.error(`[processor] article failed ${article.url}:`, (err as Error).message);
    }
  }

  return collectedVocab;
}
