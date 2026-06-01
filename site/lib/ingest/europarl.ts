// European Parliament connector.
// Covers French MEPs who lead or are prominent in their EP group.
//
// Strategy: fetch each EP group's press-release RSS feed and attribute
// items to the matching French MEP using name patterns. MEPs who chair
// or hold senior positions in their group appear frequently in group
// communications.
//
// Feed availability as of 2025-05 (re-verified):
//   pol-glucksmann → S&D: https://www.socialistsanddemocrats.eu/rss.xml (✓ Drupal RSS)
//   pol-aubry      → The Left: https://www.left.eu/feed/ (✓ WordPress, may Cloudflare-challenge locally)
//
// No working public RSS feeds found for:
//   pol-hayer    (Renew Europe)   — Craft CMS, no feed endpoint exposed
//   pol-bellamy  (EPP)            — feed exists at /rss.xml but returns Drupal 403
//   pol-marechal (Patriots)       — Laravel app, no XML feed
//   pol-toussaint (Greens/EFA)    — no feed auto-discovery link, all paths 404
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
  // Drupal-based site; RSS at top-level /rss.xml (verified 200 OK).
  {
    url: "https://www.socialistsanddemocrats.eu/rss.xml",
    channel: "S&D (Parlement européen)",
    patterns: [
      { politician_id: "pol-glucksmann", keywords: ["glucksmann", "raphaël glucksmann", "raphael glucksmann"] },
    ],
  },
  // The Left (GUE-NGL) — Manon Aubry is co-president.
  // WordPress-based; standard /feed/ endpoint. May be Cloudflare-challenged
  // from residential IPs but works from Vercel's datacenter ranges.
  {
    url: "https://www.left.eu/feed/",
    channel: "The Left / GUE-NGL (Parlement européen)",
    patterns: [
      { politician_id: "pol-aubry", keywords: ["manon aubry", "aubry"] },
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
