import axios from "axios";
import * as cheerio from "cheerio";
import Parser from "rss-parser";
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import { SOURCES, INewsSource } from "../config/sources";
import { env } from "../config/env";
import { IRawArticle } from "../types/pipeline";

const rss = new Parser({ timeout: 15000 });

const http = axios.create({
  timeout: 20000,
  headers: {
    // Some sites block default axios UA.
    "User-Agent":
      "Mozilla/5.0 (compatible; EditorialIntersectionBot/0.1; +https://example.com)",
  },
});

const SENTENCE_RE = /(?<=[.!?])\s+(?=[A-Z"'À-ſ])/;

// Newspaper HTML often glues sentences together (".CapitalLetter") and leaves
// image-credit tokens ("Collected", "File photo") embedded in body text.
// Normalize before sentence splitting so the splitter and the LLM both see
// clean prose.
const CAPTION_TOKENS = [
  "Collected",
  "File photo",
  "File Photo",
  "Star File Photo",
  "Star Online Graphics",
  "Star Graphics",
  "Star Multimedia",
  "Representational image",
  "Representational Image",
  "Reuters Photo",
  "AFP Photo",
];

function cleanBodyText(text: string): string {
  let s = text;

  // Decode the handful of HTML entities Readability/cheerio leave behind.
  s = s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&lsquo;|&rsquo;/g, "'");

  // Strip "Photo: ..." / "Photo Credit: ..." captions up to the next period.
  s = s.replace(/\bPhoto(?:\s+Credit)?:[^.]*\.?/g, " ");

  // Strip newspaper header/byline metadata Readability glues into the body,
  // e.g. Daily Star's "8 June 2026, 18:40 PM UPDATED 7 hour(s) ago VISUAL: STAR".
  const MONTHS =
    "Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?";
  s = s.replace(new RegExp(`\\b\\d{1,2}\\s+(?:${MONTHS})\\s+\\d{4},?\\s*\\d{1,2}:\\d{2}\\s*(?:AM|PM)?`, "gi"), " ");
  s = s.replace(/\bUPDATED\b/g, " "); // all-caps header marker only, not prose "updated"
  s = s.replace(/\b\d+\s*(?:second|minute|hour|day|week|month|year)s?(?:\(s\))?\s+ago\b/gi, " ");
  // "VISUAL: STAR" — credit is an all-caps token (2+ caps), so we don't eat "The".
  s = s.replace(/\bVISUAL:\s*[A-Z]{2,}(?:\s+[A-Z]{2,})*/g, " ");

  // Strip standalone caption tokens when they appear glued or surrounded by
  // sentence punctuation. Only matches the capitalised form so we don't
  // mangle normal usage of these words.
  for (const tok of CAPTION_TOKENS) {
    const escaped = tok.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    s = s.replace(new RegExp(`(?<=[.!?])\\s*${escaped}(?=\\s*[A-Z])`, "g"), " ");
  }

  // Insert a space when sentence-ending punctuation runs into the next sentence.
  s = s.replace(/([.!?])(["'])?([A-ZÀ-ſ])/g, (_m, p, q = "", c) => `${p}${q} ${c}`);

  // Collapse any remaining whitespace.
  return s.replace(/\s+/g, " ").trim();
}

// rss-parser hands back title/description in whatever shape xml2js produced:
//   plain string ........................ <title>Hello</title>
//   { _: "Hello", $: { lang: "en" } } ... <title lang="en">Hello</title>
//   { a: { _: "Hello", $: {...} } } ..... <title><a href="...">Hello</a></title>  (Daily Star)
// Walk the tree, collect text leaves, strip any embedded HTML.
function extractText(v: unknown): string {
  if (typeof v === "string") return v;
  if (v == null) return "";
  if (Array.isArray(v)) return v.map(extractText).filter(Boolean).join(" ");
  if (typeof v === "object") {
    const obj = v as Record<string, unknown>;
    // xml2js text-content keys first
    for (const key of ["_", "#text", "text", "$t"]) {
      if (typeof obj[key] === "string") return obj[key] as string;
    }
    // Otherwise recurse into children, skipping attribute containers
    const parts: string[] = [];
    for (const [k, val] of Object.entries(obj)) {
      if (k === "$" || k.startsWith("@")) continue;
      const inner = extractText(val);
      if (inner) parts.push(inner);
    }
    return parts.join(" ");
  }
  return "";
}

function asString(v: unknown, fallback = ""): string {
  const raw = extractText(v);
  if (!raw) return fallback;
  const cleaned = raw.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  return cleaned || fallback;
}

function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .trim()
    .split(SENTENCE_RE)
    .map((s) => s.trim())
    .filter((s) => s.length > 20 && s.length < 600);
}

// MAX_SENTENCES_PER_ARTICLE caps how many sentences we process per article to
// control Gemini cost. 0 means "no cap" — process the full article.
function capSentences(sentences: string[]): string[] {
  const max = env.MAX_SENTENCES_PER_ARTICLE;
  return max > 0 ? sentences.slice(0, max) : sentences;
}

async function extractArticleBody(url: string): Promise<string> {
  const { data: html } = await http.get<string>(url, { responseType: "text" });

  // Readability is the primary path but throws on some malformed pages
  // (Daily Star has broken inline CSS that crashes JSDOM during parse).
  try {
    // virtualConsole.sendTo() silences the CSS-parse-error stream
    const { VirtualConsole } = await import("jsdom");
    const virtualConsole = new VirtualConsole();
    const dom = new JSDOM(html, { url, virtualConsole });
    const reader = new Readability(dom.window.document);
    const parsed = reader.parse();
    if (parsed?.textContent && parsed.textContent.length > 200) {
      return parsed.textContent;
    }
  } catch (err) {
    console.warn(`[scraper] readability fell back for ${url}:`, (err as Error).message);
  }

  // Cheerio fallback — grab paragraph text from common article containers.
  const $ = cheerio.load(html);
  return $("article p, .article-content p, .story-content p, .field-body p, p")
    .map((_, el) => $(el).text())
    .get()
    .join(" ");
}

async function fetchFromRss(source: INewsSource): Promise<IRawArticle[]> {
  if (!source.rss) return [];
  const feed = await rss.parseURL(source.rss);
  const items = feed.items.slice(0, env.MAX_ARTICLES_PER_SOURCE);
  const results: IRawArticle[] = [];
  for (const item of items) {
    if (!item.link) continue;
    try {
      const body = cleanBodyText(await extractArticleBody(item.link));
      const sentences = capSentences(splitSentences(body));
      if (sentences.length === 0) continue;
      results.push({
        source: source.name,
        title: asString(item.title, "(untitled)"),
        url: item.link,
        publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
        sentences,
      });
    } catch (err) {
      console.warn(`[scraper] failed ${source.name} ${item.link}:`, (err as Error).message);
    }
  }
  return results;
}

async function fetchFromIndex(source: INewsSource): Promise<IRawArticle[]> {
  if (!source.indexUrl || !source.linkSelector) return [];
  const { data: html } = await http.get<string>(source.indexUrl);
  const $ = cheerio.load(html);
  const base = new URL(source.indexUrl);
  const links: string[] = [];
  $(source.linkSelector).each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    try {
      const abs = new URL(href, base).toString();
      if (!links.includes(abs)) links.push(abs);
    } catch {
      // ignore
    }
  });
  const results: IRawArticle[] = [];
  for (const link of links.slice(0, env.MAX_ARTICLES_PER_SOURCE)) {
    try {
      const body = cleanBodyText(await extractArticleBody(link));
      const sentences = capSentences(splitSentences(body));
      if (sentences.length === 0) continue;
      const title = body.split(SENTENCE_RE)[0]?.slice(0, 120) ?? "(untitled)";
      results.push({
        source: source.name,
        title,
        url: link,
        publishedAt: new Date(),
        sentences,
      });
    } catch (err) {
      console.warn(`[scraper] failed ${source.name} ${link}:`, (err as Error).message);
    }
  }
  return results;
}

// Quintype CMS exposes a public JSON API: a section listing endpoint plus a
// per-story endpoint whose cards/story-elements carry the clean body text.
// No RSS or headless browser needed.
interface IQuintypeElement {
  type: string;
  text?: string;
}
interface IQuintypeStory {
  headline?: string;
  slug?: string;
  url?: string;
  "first-published-at"?: number;
  cards?: { "story-elements"?: IQuintypeElement[] }[];
}

async function fetchFromQuintype(source: INewsSource): Promise<IRawArticle[]> {
  const cfg = source.quintype;
  if (!cfg) return [];
  const listUrl =
    `${cfg.baseUrl}/api/v1/advanced-search` +
    `?section-name=${encodeURIComponent(cfg.section)}` +
    `&limit=${env.MAX_ARTICLES_PER_SOURCE}` +
    `&fields=headline,slug,url,first-published-at`;
  const { data: list } = await http.get<{ items?: IQuintypeStory[] }>(listUrl);
  const items = list.items ?? [];
  const results: IRawArticle[] = [];
  for (const item of items) {
    if (!item.slug || !item.url) continue;
    try {
      const { data: full } = await http.get<{ story?: IQuintypeStory }>(
        `${cfg.baseUrl}/api/v1/stories-by-slug?slug=${encodeURIComponent(item.slug)}`,
      );
      const rawText = (full.story?.cards ?? [])
        .flatMap((c) => c["story-elements"] ?? [])
        .filter((e) => e.type === "text" && e.text)
        .map((e) => (e.text as string).replace(/<[^>]+>/g, " "))
        .join(" ");
      const sentences = capSentences(splitSentences(cleanBodyText(rawText)));
      if (sentences.length === 0) continue;
      results.push({
        source: source.name,
        title: item.headline ?? "(untitled)",
        url: item.url,
        publishedAt: item["first-published-at"] ? new Date(item["first-published-at"]) : new Date(),
        sentences,
      });
    } catch (err) {
      console.warn(`[scraper] quintype failed ${source.name} ${item.slug}:`, (err as Error).message);
    }
  }
  return results;
}

export async function scrapeArticles(): Promise<IRawArticle[]> {
  const all: IRawArticle[] = [];
  for (const source of SOURCES) {
    try {
      const articles = source.quintype
        ? await fetchFromQuintype(source)
        : source.rss
          ? await fetchFromRss(source)
          : await fetchFromIndex(source);
      console.log(`[scraper] ${source.name}: ${articles.length} articles`);
      all.push(...articles);
    } catch (err) {
      console.error(`[scraper] source ${source.name} failed:`, (err as Error).message);
    }
  }
  return all;
}
