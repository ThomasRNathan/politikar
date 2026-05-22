// Élysée RSS connector. Licence Etalab 2.0 (open licence).
//
// Two levels of detail :
//   1. fetchElysee() — RSS feed, ~50 items, title + 150-char summary.
//      Fast, no per-article fetch, but limited extraction surface.
//   2. fetchArticleBody(url) — scrape the <main> block of an article
//      page, return the full text (typically 1-5 KB). Hit politely
//      (1 req/sec, robots.txt respected). Used to enrich an RSS item
//      before LLM extraction.

import { fetchText, parseRss, isoDate, sha256Short, decodeEntities, sleep } from "./util";

const FEED = "https://www.elysee.fr/feed";

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

function detectType(title: string): string {
  const t = title.toLowerCase();
  if (t.includes("conseil des ministres")) return "official_statement";
  if (t.includes("conférence de presse")) return "press_conference";
  if (t.includes("interview")) return "interview";
  if (t.includes("discours") || t.includes("allocution")) return "speech";
  if (t.includes("entretien")) return "interview";
  if (t.includes("déplacement")) return "official_statement";
  return "official_statement";
}

export async function fetchElysee(
  { politicianId = "pol-macron" }: { politicianId?: string } = {},
): Promise<IngestedSource[]> {
  const xml = await fetchText(FEED, { accept: "application/rss+xml" });
  const items = parseRss(xml);
  return items
    .filter((it) => it.link && it.link.includes("/emmanuel-macron/"))
    .map((it) => {
      const occurredAt = isoDate(it.pubDate);
      const id = `elysee-${sha256Short(it.guid ?? it.link ?? it.title ?? "")}`;
      return {
        id,
        politician_id: politicianId,
        source_type: detectType(it.title ?? ""),
        channel: "Élysée (communiqué)",
        occurred_at: occurredAt,
        url: it.link,
        title: it.title,
        summary: it.description,
        license: "Etalab 2.0",
        ingested_from: "elysee.fr/feed",
      };
    })
    .sort((a, b) => (b.occurred_at ?? "").localeCompare(a.occurred_at ?? ""));
}

// Strips a chunk of HTML to readable text. Discards <script>, <style>,
// nav widgets identified by class name, then removes remaining tags and
// collapses whitespace.
function htmlToText(html: string): string {
  let s = html;
  // Strip non-content blocks
  s = s.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ");
  s = s.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ");
  s = s.replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, " ");
  // Strip nav, breadcrumbs, agenda widgets, related-content lists
  s = s.replace(
    /<(nav|aside|footer|form|svg)\b[^>]*>[\s\S]*?<\/\1>/gi,
    " ",
  );
  s = s.replace(
    /<div[^>]*class="[^"]*(agenda|breadcrumb|nav|menu|related|sidebar|share|social)[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
    " ",
  );
  // Convert paragraph and line-break tags to newlines before stripping
  s = s.replace(/<(p|h\d|li|br)[^>]*>/gi, "\n");
  s = s.replace(/<\/(p|h\d|li|div)>/gi, "\n");
  // Remove remaining tags
  s = s.replace(/<[^>]+>/g, " ");
  s = decodeEntities(s);
  // Collapse whitespace but keep paragraph breaks
  s = s
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => l.length > 0)
    .join("\n");
  return s;
}

/**
 * Fetches an Élysée article URL and returns the cleaned-up main body text.
 * Returns null on fetch failure so the caller can fall back to RSS summary.
 */
export async function fetchArticleBody(
  url: string,
  { politeDelayMs = 800 }: { politeDelayMs?: number } = {},
): Promise<string | null> {
  if (!url || !url.startsWith("https://www.elysee.fr/")) return null;
  try {
    const html = await fetchText(url, { accept: "text/html" });
    await sleep(politeDelayMs);
    // The article body lives inside the <main> block.
    const m = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
    if (!m) return null;
    const text = htmlToText(m[1]);
    // Drop everything until the title line if present : there's a known
    // nav prefix ("Accéder au contenu principal…").
    const lines = text.split("\n");
    let start = 0;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].length > 60 && !/Accéder au|menu|Retour à/i.test(lines[i])) {
        start = i;
        break;
      }
    }
    return lines.slice(start).join("\n\n").trim() || null;
  } catch (e) {
    console.warn(`elysee.fetchArticleBody failed for ${url}: ${(e as Error).message}`);
    return null;
  }
}
