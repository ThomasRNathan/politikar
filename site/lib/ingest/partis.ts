// Party press-feed connector. Brings opposition and non-executive voices
// into the pipeline : the Élysée and gouvernement.fr connectors only
// cover the executive, so without this the corpus skews pro-government.
//
// Source : standard WordPress RSS feeds of party websites. Each feed is
// tied to a party fixture id ; an item is attributed to a politician
// ONLY when that politician (a) belongs to the same party in fixtures
// and (b) is named in the item title or body. Hostile mentions of
// opponents therefore never create sources for them, and the extraction
// prompt's orator guard discards quotes that are not the politician's
// own words.
//
// When several same-party politicians are named, the item goes to the
// one named in the title, else the highest-tier one : raw_text dedup
// (sha256) means one source row per article, so we pick a single
// speaker rather than duplicating the text per politician.
//
// Licensing : party communiqués are not Etalab ; we store a short
// excerpt + link (citation courte), same policy as fact-checkers.
//
// Feeds verified live (June 2026) : LFI, LR. PS (parti-socialiste.fr),
// RN (rassemblementnational.fr), Renaissance (parti-renaissance.fr)
// returned 404 on standard WordPress paths and Les Écologistes sits
// behind Cloudflare ; add them here once a working feed URL is known.

import { POLITICIANS } from "@/lib/fixtures";
import { containsName, fetchText, parseRss, isoDate, sha256Short, htmlToPlainText } from "./util";
import type { IngestedSource } from "./elysee";

export type { IngestedSource };

type PartyFeed = {
  /** Party fixture id, e.g. "p-lfi". */
  partyId: string;
  outlet: string;
  url: string;
};

export const PARTY_FEEDS: PartyFeed[] = [
  { partyId: "p-lfi", outlet: "La France insoumise", url: "https://lafranceinsoumise.fr/feed/" },
  { partyId: "p-lr",  outlet: "Les Républicains",    url: "https://republicains.fr/feed/" },
];

const MAX_BODY_CHARS = 6000;

function detectSpeaker(
  partyId: string,
  title: string,
  body: string,
): (typeof POLITICIANS)[number] | null {
  const members = POLITICIANS.filter((p) => p.party_id === partyId);
  const inTitle = members.filter((p) => containsName(title, p.family_name));
  const pool = inTitle.length > 0
    ? inTitle
    : members.filter((p) => containsName(body, p.full_name));
  if (pool.length === 0) return null;
  // Highest tier wins (P0 < P1 < P2 lexicographically, conveniently).
  return [...pool].sort((a, b) => a.tier.localeCompare(b.tier))[0];
}

export type FetchResult = {
  items: IngestedSource[];
  errors: { party: string; message: string }[];
};

export async function fetchPartyFeeds(
  { feeds = PARTY_FEEDS, limitPerFeed = 30 }: { feeds?: PartyFeed[]; limitPerFeed?: number } = {},
): Promise<FetchResult> {
  const items: IngestedSource[] = [];
  const errors: FetchResult["errors"] = [];

  for (const feed of feeds) {
    try {
      const xml = await fetchText(feed.url, { accept: "application/rss+xml" });
      const rss = parseRss(xml).slice(0, limitPerFeed);
      for (const it of rss) {
        if (!it.link || !it.title) continue;
        const bodyHtml = it.contentEncoded ?? it.description ?? "";
        const body = htmlToPlainText(bodyHtml).slice(0, MAX_BODY_CHARS);
        const speaker = detectSpeaker(feed.partyId, it.title, body);
        if (!speaker) continue;
        items.push({
          id: `parti-${sha256Short(it.guid ?? it.link)}`,
          politician_id: speaker.id,
          source_type: "official_statement",
          channel: `Communiqué ${feed.outlet}`,
          occurred_at: isoDate(it.pubDate),
          url: it.link,
          title: it.title,
          // Full plain-text body travels in `summary` : the pipeline
          // builds its extraction text from title + summary when no
          // body fetcher is registered for the connector.
          summary: body || it.description,
          license: `© ${feed.outlet} (citation courte + lien)`,
          ingested_from: feed.url,
        });
      }
    } catch (e) {
      errors.push({ party: feed.outlet, message: (e as Error).message });
    }
  }

  items.sort((a, b) => (b.occurred_at ?? "").localeCompare(a.occurred_at ?? ""));
  return { items, errors };
}
