// Fact-checker RSS connectors. Citation courte + lien obligatoires.

import { fetchText, parseRss, isoDate, sha256Short } from "./util";

const FEEDS = [
  {
    outlet: "Les Décodeurs (Le Monde)",
    url: "https://www.lemonde.fr/les-decodeurs/rss_full.xml",
  },
  {
    outlet: "Les Surligneurs",
    url: "https://www.lessurligneurs.eu/feed",
  },
];

export type IngestedFactcheck = {
  id: string;
  outlet: string;
  title: string;
  summary: string | null;
  url: string;
  published_at: string | null;
  ingested_from: string;
};

export type FetchResult = {
  items: IngestedFactcheck[];
  errors: { outlet: string; message: string }[];
};

export async function fetchFactchecks(
  { limitPerOutlet = 20 }: { limitPerOutlet?: number } = {},
): Promise<FetchResult> {
  const out: IngestedFactcheck[] = [];
  const errors: { outlet: string; message: string }[] = [];
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
      errors.push({ outlet: f.outlet, message: (e as Error).message });
    }
  }
  out.sort((a, b) =>
    (b.published_at ?? "").localeCompare(a.published_at ?? "")
  );
  return { items: out, errors };
}
