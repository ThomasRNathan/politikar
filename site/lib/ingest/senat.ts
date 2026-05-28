// Sénat RSS connector — communiqués et discours du Président du Sénat.
// License: Etalab 2.0 (open licence).
//
// The Sénat publishes a press-release feed at senat.fr/presse/feed.
// Items belonging to tracked senators are identified by name pattern
// matching on title and author fields.

import { fetchText, parseRss, isoDate, sha256Short, htmlToPlainText } from "./util";

const FEEDS = [
  {
    url: "https://www.senat.fr/rss/communiques.xml",
    label: "Sénat (communiqués)",
  },
  {
    url: "https://www.senat.fr/rss/actualites.xml",
    label: "Sénat (actualités)",
  },
];

export type IngestedSource = {
  id: string;
  politician_id: string;
  source_type: string;
  channel: string;
  occurred_at: string | null;
  url: string | null;
  title: string | null;
  summary: string | null;
  license: string;
  ingested_from: string;
};

type SenatorSpec = {
  id: string;
  full_name: string;
  patterns: string[];
};

const TRACKED_SENATORS: SenatorSpec[] = [
  {
    id: "pol-larcher",
    full_name: "Gérard Larcher",
    patterns: ["larcher", "président du sénat", "president du senat"],
  },
  {
    id: "pol-kanner",
    full_name: "Patrick Kanner",
    patterns: ["kanner", "groupe socialiste"],
  },
];

function detectSenator(title: string, description: string | null): SenatorSpec | null {
  const haystack = `${title} ${description ?? ""}`.toLowerCase();
  for (const s of TRACKED_SENATORS) {
    if (s.patterns.some((p) => haystack.includes(p))) return s;
  }
  return null;
}

function detectType(title: string): string {
  const t = title.toLowerCase();
  if (t.includes("discours") || t.includes("allocution")) return "speech";
  if (t.includes("interview") || t.includes("entretien")) return "interview";
  if (t.includes("communiqué")) return "official_statement";
  return "official_statement";
}

export async function fetchSenat(
  { limitPerFeed = 30 }: { limitPerFeed?: number } = {},
): Promise<IngestedSource[]> {
  const out: IngestedSource[] = [];

  for (const feed of FEEDS) {
    try {
      const xml = await fetchText(feed.url, { accept: "application/rss+xml" });
      const items = parseRss(xml).slice(0, limitPerFeed);
      for (const it of items) {
        if (!it.link || !it.title) continue;
        const senator = detectSenator(it.title, it.description);
        if (!senator) continue;

        // Extract plain-text summary from content:encoded when available
        let summary = it.description;
        if (it.contentEncoded && it.contentEncoded.length > 80) {
          const pt = htmlToPlainText(it.contentEncoded).slice(0, 600);
          if (pt.length > 80) summary = pt;
        }

        const id = `senat-${sha256Short(it.guid ?? it.link ?? it.title ?? "")}`;
        out.push({
          id,
          politician_id: senator.id,
          source_type: detectType(it.title),
          channel: feed.label,
          occurred_at: isoDate(it.pubDate),
          url: it.link,
          title: it.title,
          summary,
          license: "Etalab 2.0",
          ingested_from: feed.url,
        });
      }
    } catch (e) {
      console.warn(`fetchSenat feed ${feed.url} failed: ${(e as Error).message}`);
    }
  }

  // Dedup by id
  const seen = new Set<string>();
  return out
    .filter((s) => {
      if (seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    })
    .sort((a, b) => (b.occurred_at ?? "").localeCompare(a.occurred_at ?? ""));
}
