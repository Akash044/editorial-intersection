export interface INewsSource {
  name: string;
  rss?: string;
  // For sites without RSS, an index URL + a selector for article links.
  indexUrl?: string;
  linkSelector?: string;
  // Optional override selector if Readability mis-extracts.
  contentSelector?: string;
}

export const SOURCES: INewsSource[] = [
  {
    name: "The Daily Star",
    rss: "https://www.thedailystar.net/opinion/rss.xml",
  },
  {
    name: "Prothom Alo English",
    rss: "https://en.prothomalo.com/opinion",
  },
  {
    name: "The Guardian",
    rss: "https://www.theguardian.com/commentisfree/rss",
  },
  {
    name: "NYT Opinion",
    // NYT body is often paywalled — Readability may only grab the lede.
    rss: "https://rss.nytimes.com/services/xml/rss/nyt/Opinion.xml",
  },
  // The Daily Observer BD: their category URL structure changed and we don't
  // have a confirmed current path for editorials. Re-enable once verified.
  // {
  //   name: "The Daily Observer BD",
  //   indexUrl: "https://www.observerbd.com/...",
  //   linkSelector: "...",
  // },
];
