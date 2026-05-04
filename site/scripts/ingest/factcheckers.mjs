// Fact-checker RSS connectors. We capture recent fact-checks as a
// reference corpus that the verification cascade will eventually search
// against. Citations courtes + lien obligatoires.

import { fetchText, parseRss, isoDate, sha256Short } from "./util.mjs";

const FEEDS = [
  {
    outlet: "Les Décodeurs (Le Monde)",
    url: "https://www.lemonde.fr/les-decodeurs/rss_full.xml",
    note: "Fil complet Les Décodeurs. Articles non strictement fact-check, à filtrer côté ingestion.",
  },
  {
    outlet: "Les Surligneurs",
    url: "https://www.lessurligneurs.eu/feed",
    note: "Legal-checking de l'actualité. CC BY-NC-SA.",
  },
];

export async function fetchFactchecks({ limitPerOutlet = 20 } = {}) {
  const out = [];
  for (const f of FEEDS) {
    try {
      const xml = await fetchText(f.url, { accept: "application/rss+xml" });
      const items = parseRss(xml).slice(0, limitPerOutlet);
      for (const it of items) {
        if (!it.link || !it.title) continue;
        out.push({
          id: `fc-${sha256Short(it.link)}`,
          outlet: f.outlet,
          title: it.title,
          summary: it.description,
          url: it.link,
          published_at: isoDate(it.pubDate),
          ingested_from: f.url,
        });
      }
    } catch (e) {
      console.warn(`factcheckers: ${f.outlet} failed: ${e.message}`);
    }
  }
  return out.sort((a, b) =>
    (b.published_at ?? "").localeCompare(a.published_at ?? "")
  );
}
