// Gouvernement.fr / info.gouv.fr connector.
// Fetches official communiqués and speeches from the French government RSS.
// License: Etalab 2.0 (open licence).
//
// Two feeds are tried in order — the gouvernement.fr RSS covers the full
// government; info.gouv.fr is the post-2024 government portal that
// publishes ministerial press releases.
//
// Attribution policy : an item is assigned to a minister ONLY when their
// family name appears in the title or URL. Ministry keywords alone
// ("travail", "culture", …) are deliberately NOT used : a communiqué
// about a ministry is not a statement BY its minister, and misattributed
// claims are the worst failure mode for a véracité platform. The
// extraction prompt provides a second guard (it only extracts claims
// attributable to the named orator).
//
// Exception : "premier ministre" / "matignon" map to the sitting PM,
// whose communiqués are signed by function more often than by name.
//
// Registry verified against the Lecornu II government as recomposed on
// 26 February 2026 (vie-publique.fr / info.gouv.fr).

import { containsName, fetchText, parseRss, isoDate, sha256Short, decodeEntities, sleep } from "./util";

const FEEDS = [
  "https://www.gouvernement.fr/rss",
  "https://www.info.gouv.fr/flux-rss",
  // Ministry feed that is NOT Cloudflare-blocked (unlike the two portals
  // above): items naming a tracked minister (e.g. Darmanin) are attributed
  // to them via the whole-word name matcher.
  "https://www.justice.gouv.fr/rss.xml",
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

type GovernmentMember = {
  /** Fixture politician id — metadata is resolved from lib/fixtures.ts. */
  id: string;
  /** Lower-cased name variants. Match ANY in title or URL wins. */
  patterns: string[];
};

// Gouvernement Lecornu II, remaniement du 26 février 2026.
export const GOVERNMENT_MEMBERS: GovernmentMember[] = [
  { id: "pol-lecornu",  patterns: ["lecornu", "premier ministre", "matignon"] },
  { id: "pol-vautrin",  patterns: ["vautrin"] },   // Armées et Anciens combattants
  { id: "pol-nunez",    patterns: ["nuñez", "nunez"] }, // Intérieur
  { id: "pol-lescure",  patterns: ["lescure"] },   // Économie et Finances
  { id: "pol-farandou", patterns: ["farandou"] },  // Travail et Solidarités
  { id: "pol-rist",     patterns: ["rist"] },      // Santé et Familles
  { id: "pol-barrot",   patterns: ["barrot"] },    // Europe et Affaires étrangères
  { id: "pol-pegard",   patterns: ["pégard", "pegard"] }, // Culture
  { id: "pol-genevard", patterns: ["genevard"] },  // Agriculture
  { id: "pol-geffray",  patterns: ["geffray"] },   // Éducation nationale
  { id: "pol-darmanin", patterns: ["darmanin"] },  // Justice
];

function detectPolitician(title: string, url: string): GovernmentMember | null {
  // URLs use hyphens as separators ; turn them into spaces so the
  // word-boundary matcher sees "laurent-nunez" as two words.
  const haystack = `${title} ${url.replace(/[-_/]/g, " ")}`;
  for (const spec of GOVERNMENT_MEMBERS) {
    if (spec.patterns.some((p) => containsName(haystack, p))) return spec;
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
  const allowed =
    url?.startsWith("https://www.gouvernement.fr/") ||
    url?.startsWith("https://www.info.gouv.fr/");
  if (!allowed) {
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
