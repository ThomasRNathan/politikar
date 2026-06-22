// Connector registry — one entry per source connector.
//
// Politician metadata (name, function, party, tier) is derived from
// lib/fixtures.ts, the single source of truth for the referential. The
// connectors themselves only decide WHICH politician an item belongs to;
// everything the prompts need comes from the fixtures.
//
// To track a new politician:
//   1. Add them to POLITICIANS in lib/fixtures.ts (and run `npm run db:seed`).
//   2. Reference their fixture id in a connector registry below
//      (GOVERNMENT_MEMBERS, TRACKED_DEPUTIES, PARTY_FEEDS, …).
//   3. If a new source type is needed, create lib/ingest/<connector>.ts
//      and add a block to fetchAllSources().

import { FUNCTIONS, PARTIES, POLITICIANS } from "@/lib/fixtures";
import type { Tier } from "@/lib/types";
import { fetchElysee, fetchArticleBody, type IngestedSource } from "@/lib/ingest/elysee";
import { fetchGouvernement, fetchGouvernementBody } from "@/lib/ingest/gouvernement";
import { fetchNosDeputes, TRACKED_DEPUTIES } from "@/lib/ingest/nosdeputes";
import { fetchPartyFeeds } from "@/lib/ingest/partis";

export type PoliticianMeta = {
  id: string;        // fixture politician id, e.g. "pol-macron"
  full_name: string;
  function_name: string;
  party: string;
  tier: Tier;
};

const POLITICIANS_BY_ID = new Map(POLITICIANS.map((p) => [p.id, p]));

/**
 * Metadata for the extraction/verification prompts, derived from fixtures.
 * The function label prefers the first sentence of the bio (which carries
 * the precise portfolio, e.g. "Ministre de l'Intérieur") over the generic
 * function name ("Ministre").
 */
export function politicianMeta(politicianId: string): PoliticianMeta | null {
  const p = POLITICIANS_BY_ID.get(politicianId);
  if (!p) return null;
  const party = PARTIES.find((x) => x.id === p.party_id)?.name ?? "Sans étiquette";
  const generic = FUNCTIONS.find((f) => f.id === p.function_id)?.name ?? "";
  const bioFirstSentence = p.bio_short.split(/\.\s/)[0]?.replace(/\.$/, "").trim();
  return {
    id: p.id,
    full_name: p.full_name,
    function_name: bioFirstSentence || generic,
    party,
    tier: p.tier,
  };
}

export type ConnectorBatch = {
  sources: IngestedSource[];
  meta: PoliticianMeta;
  /** Optional: fetch article body given a source URL. */
  fetchBody?: (url: string) => Promise<string | null>;
};

/** Group sources by politician and emit one batch per politician whose
 * fixture metadata resolves. Unknown ids are dropped with a warning so a
 * registry typo can't silently misattribute claims. */
function batchesByPolitician(
  sources: IngestedSource[],
  fetchBody?: (url: string) => Promise<string | null>,
): ConnectorBatch[] {
  const byPol: Record<string, IngestedSource[]> = {};
  for (const s of sources) {
    (byPol[s.politician_id] ??= []).push(s);
  }
  const out: ConnectorBatch[] = [];
  for (const [polId, srcs] of Object.entries(byPol)) {
    const meta = politicianMeta(polId);
    if (!meta) {
      console.warn(`connector: unknown politician id ${polId} — ${srcs.length} item(s) dropped`);
      continue;
    }
    out.push({ sources: srcs, meta, fetchBody });
  }
  return out;
}

/** Fetch all sources from all connectors. Each connector is isolated :
 * one failing upstream never blocks the others. */
export async function fetchAllSources(): Promise<ConnectorBatch[]> {
  const batches: ConnectorBatch[] = [];

  // --- Élysée (président de la République) ---
  try {
    const sources = await fetchElysee({ politicianId: "pol-macron" });
    batches.push(...batchesByPolitician(sources, fetchArticleBody));
  } catch (e) {
    console.warn("connector:elysee failed:", (e as Error).message);
  }

  // --- Gouvernement.fr / info.gouv.fr (Premier ministre + ministres) ---
  try {
    const sources = await fetchGouvernement({ limitPerFeed: 50 });
    batches.push(...batchesByPolitician(sources, fetchGouvernementBody));
  } catch (e) {
    console.warn("connector:gouvernement failed:", (e as Error).message);
  }

  // --- NosDéputés (interventions à l'Assemblée nationale) ---
  // Upstream serves the XVIe législature only (Regards Citoyens never
  // relaunched for the XVIIe) ; the connector stays wired so coverage
  // resumes automatically if the API comes back, but expect 0 items.
  try {
    const { items, errors } = await fetchNosDeputes({ deputies: TRACKED_DEPUTIES });
    if (errors.length > 0) {
      console.warn(
        "nosdeputes partial errors:",
        errors.map((e) => `${e.deputy}: ${e.message}`).join(", "),
      );
    }
    batches.push(...batchesByPolitician(items));
  } catch (e) {
    console.warn("connector:nosdeputes failed:", (e as Error).message);
  }

  // --- Party press feeds (opposition + majorité hors exécutif) ---
  // Full article text already travels in `summary` ; no body fetcher.
  try {
    const { items, errors } = await fetchPartyFeeds();
    if (errors.length > 0) {
      console.warn(
        "partis partial errors:",
        errors.map((e) => `${e.party}: ${e.message}`).join(", "),
      );
    }
    batches.push(...batchesByPolitician(items));
  } catch (e) {
    console.warn("connector:partis failed:", (e as Error).message);
  }

  return batches;
}
