import cron from "node-cron";
import { env } from "../config/env";
import { scrapeArticles } from "./scraper";
import { processArticles } from "./processor";
import { sendDailyNotification } from "./notifier";

let running = false;

export async function runPipeline(): Promise<void> {
  if (running) {
    console.log("[pipeline] already running — skip");
    return;
  }
  running = true;
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
    console.error("[pipeline] failed:", err);
  } finally {
    running = false;
  }
}

export function startScheduler(): void {
  if (!cron.validate(env.PIPELINE_CRON)) {
    console.error(`[scheduler] invalid cron "${env.PIPELINE_CRON}"`);
    return;
  }
  cron.schedule(env.PIPELINE_CRON, runPipeline, { timezone: env.PIPELINE_TIMEZONE });
  console.log(`[scheduler] daily pipeline scheduled "${env.PIPELINE_CRON}" (${env.PIPELINE_TIMEZONE})`);
}
