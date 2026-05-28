// Gouvernement.fr / info.gouv.fr connector.
// Fetches official communiqués and speeches from the French government RSS.
// License: Etalab 2.0 (open licence).
//
// Two feeds are tried in order — the gouvernement.fr RSS covers the full
// government; info.gouv.fr is the post-2024 government portal that
// publishes ministerial press releases.
//
// Attribution heuristic: each RSS item title and URL is matched against a
// name + keyword registry to assign it to a tracked politician. Items that
// match nobody are silently skipped.

import { fetchText, parseRss, isoDate, sha256Short, decodeEntities, sleep } from "./util";

const FEEDS = [
  "https://www.gouvernement.fr/rss",
  "https://www.info.gouv.fr/flux-rss",
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

type PoliticianSpec = {
  id: string;
  full_name: string;
  /** Lower-cased keyword patterns. Match ANY in title or URL wins. */
  patterns: string[];
};

// Politicians tracked via gouvernement.fr communications.
// Pattern list: politician name variants + ministry slug keywords.
const GOVERNMENT_POLITICIANS: PoliticianSpec[] = [
  {
    id: "pol-bayrou",
    full_name: "François Bayrou",
    patterns: ["bayrou", "premier ministre", "matignon"],
  },
  {
    id: "pol-lecornu",
    full_name: "Sébastien Lecornu",
    patterns: ["lecornu", "armees", "armées", "defense", "défense"],
  },
  {
    id: "pol-retailleau",
    full_name: "Bruno Retailleau",
    patterns: ["retailleau", "interieur", "intérieur"],
  },
  {
    id: "pol-vautrin",
    full_name: "Catherine Vautrin",
    // "travail" and "sante" appear in ministry URL slugs on gouvernement.fr
    patterns: ["vautrin", "ministre-du-travail", "ministre-de-la-sante", "ministere-du-travail"],
  },
  {
    id: "pol-barrot",
    full_name: "Jean-Noël Barrot",
    patterns: ["barrot", "affaires-etrangeres", "affaires-étrangères"],
  },
  {
    id: "pol-dati",
    full_name: "Rachida Dati",
    // "culture" is too broad; match name or ministry URL slug only
    patterns: ["dati", "ministre-de-la-culture", "ministere-de-la-culture"],
  },
  {
    id: "pol-le-maire",
    full_name: "Bruno Le Maire",
    // Former minister: only match by name to avoid misattributing current
    // economy/finance articles to him now that he left government.
    patterns: ["le-maire", "lemaire"],
  },
  {
    id: "pol-borne",
    full_name: "Élisabeth Borne",
    // Former PM / Education minister: name-only matching (same reason).
    patterns: ["borne"],
  },
  {
    id: "pol-fesneau",
    full_name: "Marc Fesneau",
    patterns: ["fesneau", "agriculture"],
  },
];

function detectPolitician(title: string, url: string): PoliticianSpec | null {
  const haystack = `${title} ${url}`.toLowerCase();
  for (const spec of GOVERNMENT_POLITICIANS) {
    if (spec.patterns.some((p) => haystack.includes(p))) return spec;
  }
  return null;
}

function detectType(title: string): string {
  const t = title.toLowerCase();
  if (t.includes("conférence de presse") || t.includes("conference de presse")) {
    return "press_conference";
  }
  if (t.includes("discours") || t.includes("allocution")) return "speech";
  if (t.includes("interview") || t.includes("entretien")) return "interview";
  if (t.includes("communiqué") || t.includes("communique")) return "official_statement";
  return "official_statement";
}

// Scrape article body from gouvernement.fr — structure mirrors Élysée.
function htmlToText(html: string): string {
  let s = html;
  s = s.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ");
  s = s.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ");
  s = s.replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, " ");
  s = s.replace(/<(nav|aside|footer|form|svg)\b[^>]*>[\s\S]*?<\/\1>/gi, " ");
  s = s.replace(
    /<div[^>]*class="[^"]*(breadcrumb|nav|menu|related|sidebar|share|social)[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
    " ",
  );
  s = s.replace(/<(p|h\d|li|br)[^>]*>/gi, "\n");
  s = s.replace(/<\/(p|h\d|li|div)>/gi, "\n");
  s = s.replace(/<[^>]+>/g, " ");
  s = decodeEntities(s);
  s = s
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => l.length > 0)
    .join("\n");
  return s;
}

export async function fetchGouvernementBody(
  url: string,
  { politeDelayMs = 600 }: { politeDelayMs?: number } = {},
): Promise<string | null> {
  if (!url || !url.startsWith("https://www.gouvernement.fr/") && !url.startsWith("https://www.info.gouv.fr/")) {
    return null;
  }
  try {
    const html = await fetchText(url, { accept: "text/html" });
    await sleep(politeDelayMs);
    const m = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
    if (!m) return null;
    const text = htmlToText(m[1]);
    const lines = text.split("\n");
    let start = 0;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].length > 60 && !/Accéder au|menu|Retour à|skip/i.test(lines[i])) {
        start = i;
        break;
      }
    }
    return lines.slice(start).join("\n\n").trim() || null;
  } catch (e) {
    console.warn(`gouvernement.fetchBody failed for ${url}: ${(e as Error).message}`);
    return null;
  }
}

export async function fetchGouvernement(
  { limitPerFeed = 30 }: { limitPerFeed?: number } = {},
): Promise<IngestedSource[]> {
  const out: IngestedSource[] = [];
  for (const feedUrl of FEEDS) {
    try {
      const xml = await fetchText(feedUrl, { accept: "application/rss+xml" });
      const items = parseRss(xml).slice(0, limitPerFeed);
      for (const it of items) {
        if (!it.link || !it.title) continue;
        const spec = detectPolitician(it.title, it.link);
        if (!spec) continue;
        const id = `gov-${sha256Short(it.guid ?? it.link ?? it.title ?? "")}`;
        out.push({
          id,
          politician_id: spec.id,
          source_type: detectType(it.title),
          channel: "Gouvernement (communiqué)",
          occurred_at: isoDate(it.pubDate),
          url: it.link,
          title: it.title,
          summary: it.description,
          license: "Etalab 2.0",
          ingested_from: feedUrl,
        });
      }
    } catch (e) {
      console.warn(`fetchGouvernement feed ${feedUrl} failed: ${(e as Error).message}`);
    }
  }

  // Dedup by id, prefer first occurrence.
  const seen = new Set<string>();
  return out
    .filter((s) => {
      if (seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    })
    .sort((a, b) => (b.occurred_at ?? "").localeCompare(a.occurred_at ?? ""));
}
