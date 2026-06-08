import { GoogleGenAI, Type } from "@google/genai";
import { prisma } from "../config/db";
import { env } from "../config/env";
import { IAnalyzedSentence, IRawArticle, IVocabItem } from "../types/pipeline";

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

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

async function analyzeSentence(sentence: string): Promise<IAnalyzedSentence> {
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: env.GEMINI_MODEL,
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
      return parsed;
    } catch (err) {
      const retryAfter = parseRetryDelaySeconds(err);
      if (retryAfter != null && attempt < maxAttempts) {
        // Cap backoff at 60s so we never wedge the pipeline.
        const wait = Math.min(retryAfter, 60) * 1000;
        console.warn(`[processor] 429 — sleeping ${wait}ms then retrying`);
        await sleep(wait);
        continue;
      }
      throw err;
    }
  }
  throw new Error("unreachable");
}

export async function processArticles(articles: IRawArticle[]): Promise<IVocabItem[]> {
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
