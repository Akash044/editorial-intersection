import cron from "node-cron";
import { env } from "../config/env";
import { scrapeArticles } from "./scraper";
import { processArticles, getActiveModel, getModelChain } from "./processor";
import { sendDailyNotification } from "./notifier";

let running = false;
let lastStartedAt: Date | null = null;
let lastFinishedAt: Date | null = null;
let lastError: string | null = null;

export interface PipelineStatus {
  running: boolean;
  lastStartedAt: string | null;
  lastFinishedAt: string | null;
  lastError: string | null;
  activeModel: string;
  modelChain: string[];
}

export function getPipelineStatus(): PipelineStatus {
  return {
    running,
    lastStartedAt: lastStartedAt?.toISOString() ?? null,
    lastFinishedAt: lastFinishedAt?.toISOString() ?? null,
    lastError,
    activeModel: getActiveModel(),
    modelChain: getModelChain(),
  };
}

export async function runPipeline(): Promise<void> {
  if (running) {
    console.log("[pipeline] already running — skip");
    return;
  }
  running = true;
  lastStartedAt = new Date();
  lastError = null;
  const started = Date.now();
  console.log("[pipeline] start");
  try {
    const articles = await scrapeArticles();
    console.log(`[pipeline] scraped ${articles.length} articles`);
    const vocab = await processArticles(articles);
    console.log(`[pipeline] collected ${vocab.length} vocab items`);
    await sendDailyNotification(vocab);
    console.log(`[pipeline] done in ${Math.round((Date.now() - started) / 1000)}s`);
  } catch (err) {
    lastError = (err as Error).message;
    console.error("[pipeline] failed:", err);
  } finally {
    running = false;
    lastFinishedAt = new Date();
  }
}

export function startScheduler(): void {
  if (!env.PIPELINE_AUTO) {
    console.log("[scheduler] auto-pipeline disabled — trigger via POST /api/sync");
    return;
  }
  if (!cron.validate(env.PIPELINE_CRON)) {
    console.error(`[scheduler] invalid cron "${env.PIPELINE_CRON}"`);
    return;
  }
  cron.schedule(env.PIPELINE_CRON, runPipeline, { timezone: env.PIPELINE_TIMEZONE });
  console.log(`[scheduler] daily pipeline scheduled "${env.PIPELINE_CRON}" (${env.PIPELINE_TIMEZONE})`);
}
