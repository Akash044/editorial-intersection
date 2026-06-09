export interface INewsSource {
  name: string;
  rss?: string;
  // For sites without RSS, an index URL + a selector for article links.
  indexUrl?: string;
  linkSelector?: string;
  // Optional override selector if Readability mis-extracts.
  contentSelector?: string;
  // Quintype-CMS sites (e.g. Prothom Alo) — JS SPAs with no usable RSS but a
  // public JSON API. baseUrl is the site origin; section is the section slug.
  quintype?: { baseUrl: string; section: string };
}

export const SOURCES: INewsSource[] = [
  {
    name: "The Daily Star",
    rss: "https://www.thedailystar.net/opinion/rss.xml",
  },
  {
    name: "Prothom Alo English",
    // No populated RSS — Quintype SPA. Pull the opinion section via its JSON API.
    quintype: { baseUrl: "https://en.prothomalo.com", section: "opinion" },
  },
  {
    name: "The Guardian",
    rss: "https://www.theguardian.com/commentisfree/rss",
  },
  // NYT removed: hard subscription paywall — Readability only reached the
  // ad/nav chrome, so it produced junk "sentences". A headless browser can't
  // bypass a paywall either. Replaced with The Hindu's open-access opinion feed.
  {
    name: "The Hindu Opinion",
    rss: "https://www.thehindu.com/opinion/feeder/default.rss",
  },
  // The Daily Observer BD: their category URL structure changed and we don't
  // have a confirmed current path for editorials. Re-enable once verified.
  // {
  //   name: "The Daily Observer BD",
  //   indexUrl: "https://www.observerbd.com/...",
  //   linkSelector: "...",
  // },
];
