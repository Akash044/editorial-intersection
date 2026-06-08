import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().url(),
  GEMINI_API_KEY: z.string().min(1),
  GEMINI_MODEL: z.string().default("gemini-2.5-flash"),
  PIPELINE_CRON: z.string().default("0 0 * * *"),
  PIPELINE_TIMEZONE: z.string().default("Asia/Dhaka"),
  MAX_ARTICLES_PER_SOURCE: z.coerce.number().int().positive().default(2),
  MAX_SENTENCES_PER_ARTICLE: z.coerce.number().int().positive().default(15),
  ENABLE_NOTIFICATIONS: z
    .string()
    .default("false")
    .transform((v) => v.toLowerCase() === "true"),
  FIREBASE_SERVICE_ACCOUNT_PATH: z.string().optional(),
  FIREBASE_SERVICE_ACCOUNT_JSON: z.string().optional(),
});

export const env = schema.parse(process.env);
