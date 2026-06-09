import "dotenv/config";
import { scrapeArticles } from "../jobs/scraper";

(async () => {
  const articles = await scrapeArticles();
  console.log(`\n=== ${articles.length} articles ===\n`);
  for (const a of articles) {
    console.log(`[${a.source}] ${a.title}`);
    console.log(`  url: ${a.url}`);
    console.log(`  sentences: ${a.sentences.length}`);
    console.log(`  s1: ${a.sentences[0]?.slice(0, 160)}`);
    console.log("");
  }
  process.exit(0);
})();
