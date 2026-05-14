// Élysée RSS connector. Licence Etalab 2.0 (open licence).

import { fetchText, parseRss, isoDate, sha256Short } from "./util";

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
