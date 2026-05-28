// European Parliament connector.
// Covers French MEPs who lead or are prominent in their EP group.
//
// Strategy: fetch each EP group's press-release RSS feed and attribute
// items to the matching French MEP using name patterns. MEPs who chair
// or hold senior positions in their group appear frequently in group
// communications.
//
// We only track senior French MEPs whose statements are politically
// significant nationally:
//   pol-aubry    → Manon Aubry      (The Left / GUE-NGL, VP)
//   pol-glucksmann → Raphaël Glucksmann (S&D, group president since 2024)
//   pol-hayer    → Valérie Hayer    (Renew Europe, group president)
//   pol-bellamy  → F.-X. Bellamy    (EPP, leads French LR MEPs)
//   pol-marechal → Marion Maréchal  (Patriots for Europe)
//   pol-toussaint → Marie Toussaint (Greens/EFA, co-president)
//
// License: open-web content (EP group press releases are freely
// published). Attribution is name-based and imprecise; the extraction
// LLM will discard items with no attributable claim.

import { fetchText, parseRss, isoDate, sha256Short, htmlToPlainText, sleep } from "./util";

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

type EpFeedSpec = {
  url: string;
  channel: string;
  patterns: { politician_id: string; keywords: string[] }[];
};

const EP_FEEDS: EpFeedSpec[] = [
  // S&D — Raphaël Glucksmann is group president since July 2024.
  // His name appears prominently in group press releases.
  {
    url: "https://www.socialistsanddemocrats.eu/newsroom/press-releases/feed/",
    channel: "S&D (Parlement européen)",
    patterns: [
      { politician_id: "pol-glucksmann", keywords: ["glucksmann", "raphaël glucksmann", "raphael glucksmann"] },
    ],
  },
  // Renew Europe — Valérie Hayer is group president.
  {
    url: "https://www.reneweuropegroup.eu/press-releases/feed/",
    channel: "Renew Europe (Parlement européen)",
    patterns: [
      { politician_id: "pol-hayer", keywords: ["hayer", "valérie hayer", "valerie hayer"] },
    ],
  },
  // The Left (GUE-NGL) — Manon Aubry is co-president.
  // Their WordPress site publishes at /press-releases/
  {
    url: "https://www.left.eu/category/press-releases/feed/",
    channel: "The Left / GUE-NGL (Parlement européen)",
    patterns: [
      { politician_id: "pol-aubry", keywords: ["manon aubry", "aubry"] },
    ],
  },
  // Greens/EFA — Marie Toussaint is co-president from 2024.
  {
    url: "https://www.greens-efa.eu/en/category/press-releases/feed/",
    channel: "Verts/ALE (Parlement européen)",
    patterns: [
      { politician_id: "pol-toussaint", keywords: ["toussaint", "marie toussaint"] },
    ],
  },
  // EPP — François-Xavier Bellamy leads the French LR MEPs within EPP.
  // His name appears in EPP press releases on French political matters.
  {
    url: "https://www.eppgroup.eu/press-releases/feed/",
    channel: "PPE (Parlement européen)",
    patterns: [
      { politician_id: "pol-bellamy", keywords: ["bellamy", "bellamy-"] },
    ],
  },
  // Patriots for Europe — Marion Maréchal is a member.
  // Their RSS feed may not be readily available; we try and skip on 404.
  {
    url: "https://patriotsforeurope.eu/feed/",
    channel: "Patriots for Europe (Parlement européen)",
    patterns: [
      { politician_id: "pol-marechal", keywords: ["maréchal", "marechal", "marion maréchal"] },
    ],
  },
];

export type EuroparlResult = {
  items: IngestedSource[];
  errors: { feed: string; message: string }[];
};

/**
 * Fetch recent items from EP group press-release feeds.
 * Paced at 700 ms between requests to be polite to EP sites.
 */
export async function fetchEuroparl(
  { limitPerFeed = 20 }: { limitPerFeed?: number } = {},
): Promise<EuroparlResult> {
  const items: IngestedSource[] = [];
  const errors: { feed: string; message: string }[] = [];

  for (let i = 0; i < EP_FEEDS.length; i++) {
    if (i > 0) await sleep(700);
    const spec = EP_FEEDS[i];

    let xml: string;
    try {
      xml = await fetchText(spec.url, { accept: "application/rss+xml" });
    } catch (e) {
      // 404s are expected for feeds that don't exist yet — log and skip.
      errors.push({ feed: spec.url, message: (e as Error).message });
      continue;
    }

    const rawItems = parseRss(xml).slice(0, limitPerFeed);
    for (const it of rawItems) {
      if (!it.link || !it.title) continue;

      const haystack = `${it.title} ${it.link}`.toLowerCase();
      let politicianId: string | null = null;
      for (const p of spec.patterns) {
        if (p.keywords.some((k) => haystack.includes(k))) {
          politicianId = p.politician_id;
          break;
        }
      }
      if (!politicianId) continue;

      const id = `ep-${sha256Short(it.guid ?? it.link ?? it.title ?? "")}`;
      const rawSummary = it.contentEncoded ?? it.description ?? null;
      const summary = rawSummary
        ? htmlToPlainText(rawSummary).slice(0, 500) || null
        : null;

      items.push({
        id,
        politician_id: politicianId,
        source_type: "official_statement",
        channel: spec.channel,
        occurred_at: isoDate(it.pubDate),
        url: it.link,
        title: it.title,
        summary,
        license: "open web",
        ingested_from: spec.url,
      });
    }
  }

  // Dedup by id.
  const seen = new Set<string>();
  const deduped = items.filter((s) => {
    if (seen.has(s.id)) return false;
    seen.add(s.id);
    return true;
  });

  deduped.sort((a, b) => (b.occurred_at ?? "").localeCompare(a.occurred_at ?? ""));
  return { items: deduped, errors };
}
