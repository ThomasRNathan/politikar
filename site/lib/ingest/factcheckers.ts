// Fact-checker RSS connectors. Citation courte + lien obligatoires.
//
// Some feeds publish full article bodies via <content:encoded> (RSS
// Content module). We capture them when present : they massively
// improve match quality during the verification cascade vs matching
// against titles alone.

import { fetchText, parseRss, isoDate, sha256Short, htmlToPlainText } from "./util";

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
  /** Full article body in plain text when the feed exposes it via
   * <content:encoded>. Null when only title + summary are available
   * (paywalled feeds, etc.). Used by the verification cascade as
   * evidence context. */
  body: string | null;
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
        // content:encoded → plain text. Truncate to 4 KB so the body
        // can be injected into the verification prompt without blowing
        // up Mistral's context window when several hits stack.
        let body: string | null = null;
        if (it.contentEncoded) {
          body = htmlToPlainText(it.contentEncoded).slice(0, 4000);
          if (body.length < 80) body = null;
        }
        out.push({
          id: `fc-${sha256Short(it.link)}`,
          outlet: f.outlet,
          title: it.title,
          summary: it.description,
          body,
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
