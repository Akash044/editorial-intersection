import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().url(),
  GEMINI_API_KEY: z.string().min(1),
  GEMINI_MODEL: z.string().default("gemini-2.5-flash"),
  // Comma-separated fallbacks tried in order when the active model's daily
  // free-tier quota is exhausted. Each model has its own daily bucket.
  GEMINI_FALLBACK_MODELS: z
    .string()
    .default("gemini-2.5-flash-lite")
    .transform((v) => v.split(",").map((s) => s.trim()).filter(Boolean)),
  PIPELINE_AUTO: z
    .string()
    .default("false")
    .transform((v) => v.toLowerCase() === "true"),
  PIPELINE_CRON: z.string().default("0 0 * * *"),
  PIPELINE_TIMEZONE: z.string().default("Asia/Dhaka"),
  MAX_ARTICLES_PER_SOURCE: z.coerce.number().int().positive().default(2),
  // 0 = no cap (process the full article).
  MAX_SENTENCES_PER_ARTICLE: z.coerce.number().int().nonnegative().default(15),
  ENABLE_NOTIFICATIONS: z
    .string()
    .default("false")
    .transform((v) => v.toLowerCase() === "true"),
  FIREBASE_SERVICE_ACCOUNT_PATH: z.string().optional(),
  FIREBASE_SERVICE_ACCOUNT_JSON: z.string().optional(),
});

export const env = schema.parse(process.env);
