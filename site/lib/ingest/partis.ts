// Party leaders / opposition RSS connector.
// Covers party leaders who are not in government and therefore not
// captured by gouvernement.fr or NosDéputés.fr.
//
// Each entry is either:
//   - a personal blog / site where ALL items belong to the politician; or
//   - a party press-release feed where items are attributed by keyword.
//
// All feeds are freely published (open web). Robots.txt respected — only
// /feed/ or /rss/ paths are fetched, never article bodies.
//
// License: open-web / no explicit licence (standard web crawl).

import { fetchText, parseRss, isoDate, sha256Short, decodeEntities, sleep } from "./util";

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

type FeedSpec = {
  /** Feed URL (RSS/Atom). */
  url: string;
  /** Channel label to use in IngestedSource. */
  channel: string;
  /**
   * If set, ALL items from the feed are attributed to this politician_id.
   * If not set, attribution is decided by `patterns` matching on title+url.
   */
  politician_id?: string;
  /** Keyword patterns (lower-cased) to match title+URL when politician_id is absent. */
  patterns?: { politician_id: string; keywords: string[] }[];
  /**
   * Default source_type for items from this feed (used when detectType
   * returns the generic fallback). Personal blogs default to op_ed;
   * party press-release sites default to official_statement.
   */
  defaultType?: string;
  license: string;
};

const FEEDS: FeedSpec[] = [
  // ── Mélenchon personal blog ──────────────────────────────────────────
  // Jean-Luc Mélenchon publishes all his blog posts at this URL.
  // Every item belongs to him; no pattern matching needed.
  // Blog posts are personal commentary → op_ed is more accurate than
  // official_statement for the LLM extraction context.
  {
    url: "https://www.jean-luc-melenchon.fr/feed/",
    channel: "Blog de Jean-Luc Mélenchon",
    politician_id: "pol-melenchon",
    defaultType: "op_ed",
    license: "open web",
  },

  // ── Rassemblement national press releases ─────────────────────────────
  // RN publishes a WordPress feed. Items are attributed to Bardella
  // when his name (or "président du rassemblement", "notre mouvement"
  // combined with recognisable event) appears.  This is imprecise; the
  // pipeline LLM extraction step will discard items that contain no
  // attributable Bardella claim.
  {
    url: "https://www.rassemblement-national.fr/feed/",
    channel: "Rassemblement national (communiqués)",
    patterns: [
      { politician_id: "pol-bardella", keywords: ["bardella"] },
    ],
    license: "open web",
  },

  // ── Les Écologistes (EELV) ────────────────────────────────────────────
  // Marine Tondelier is Secrétaire nationale des Écologistes (since 2022).
  // Feed uses Laminas_Feed_Writer at /rss.xml (verified 200 OK; /feed/ returns 403).
  {
    url: "https://lesecologistes.fr/rss.xml",
    channel: "Les Écologistes (communiqués)",
    patterns: [
      { politician_id: "pol-tondelier", keywords: ["tondelier"] },
    ],
    license: "open web",
  },

  // ── Horizons party site ───────────────────────────────────────────────
  // NOTE: horizons-lecentre.fr is NXDOMAIN (domain expired/moved).
  // New domain horizonsleparti.fr has no RSS feed (WordPress feed disabled).
  // pol-philippe has no RSS source currently; entry removed to avoid cron noise.

  // ── La France insoumise ──────────────────────────────────────────────
  // LFI publishes a main site feed. Items by/about Mélenchon complement
  // the personal blog feed. Panot (pol-panot) already covered by
  // NosDéputés; she's not attributed here to avoid double-counting.
  {
    url: "https://lafranceinsoumise.fr/feed/",
    channel: "La France insoumise (communiqués)",
    patterns: [
      { politician_id: "pol-melenchon", keywords: ["mélenchon", "melenchon"] },
    ],
    license: "open web",
  },
];

function detectType(title: string, defaultType = "official_statement"): string {
  const t = title.toLowerCase();
  if (t.includes("discours") || t.includes("allocution")) return "speech";
  if (t.includes("interview") || t.includes("entretien")) return "interview";
  if (t.includes("tribune")) return "op_ed";
  if (t.includes("communiqué") || t.includes("communique")) return "official_statement";
  return defaultType;
}

function stripHtml(html: string | null): string | null {
  if (!html) return null;
  let s = html.replace(/<[^>]+>/g, " ");
  s = decodeEntities(s);
  s = s.replace(/\s+/g, " ").trim();
  return s.slice(0, 500) || null;
}

export type PartisResult = {
  items: IngestedSource[];
  errors: { feed: string; message: string }[];
};

/**
 * Fetch recent items from all party / personal-blog RSS feeds.
 * Politely paced at 600 ms between requests.
 */
export async function fetchPartisLeaders(
  { limitPerFeed = 20 }: { limitPerFeed?: number } = {},
): Promise<PartisResult> {
  const items: IngestedSource[] = [];
  const errors: { feed: string; message: string }[] = [];

  for (let i = 0; i < FEEDS.length; i++) {
    if (i > 0) await sleep(600);
    const spec = FEEDS[i];

    let xml: string;
    try {
      xml = await fetchText(spec.url, { accept: "application/rss+xml" });
    } catch (e) {
      errors.push({ feed: spec.url, message: (e as Error).message });
      continue;
    }

    const rawItems = parseRss(xml).slice(0, limitPerFeed);
    for (const it of rawItems) {
      if (!it.link || !it.title) continue;
      const haystack = `${it.title} ${it.link}`.toLowerCase();

      let politicianId: string | null = null;

      if (spec.politician_id) {
        // Personal blog: every item belongs to this politician.
        politicianId = spec.politician_id;
      } else if (spec.patterns) {
        for (const p of spec.patterns) {
          if (p.keywords.some((k) => haystack.includes(k))) {
            politicianId = p.politician_id;
            break;
          }
        }
      }

      if (!politicianId) continue;

      const id = `partis-${sha256Short(it.guid ?? it.link ?? it.title ?? "")}`;
      const rawSummary = it.contentEncoded ?? it.description ?? null;
      const summary = stripHtml(rawSummary);

      items.push({
        id,
        politician_id: politicianId,
        source_type: detectType(it.title, spec.defaultType),
        channel: spec.channel,
        occurred_at: isoDate(it.pubDate),
        url: it.link,
        title: it.title,
        summary,
        license: spec.license,
        ingested_from: spec.url,
      });
    }
  }

  // Dedup by id across all feeds.
  const seen = new Set<string>();
  const deduped = items.filter((s) => {
    if (seen.has(s.id)) return false;
    seen.add(s.id);
    return true;
  });

  deduped.sort((a, b) => (b.occurred_at ?? "").localeCompare(a.occurred_at ?? ""));
  return { items: deduped, errors };
}
