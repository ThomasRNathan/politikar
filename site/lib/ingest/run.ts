// Ingestion orchestrator. Calls all connectors and returns a snapshot
// payload that can be persisted to disk (CLI script) or Vercel Blob
// (cron route handler). Pure function except for fetch() calls.

import { fetchElysee, type IngestedSource } from "./elysee";
import { fetchGouvernement } from "./gouvernement";
import { fetchNosDéputes } from "./nosdeputes";
import { fetchSenat } from "./senat";
import { fetchFactchecks, type IngestedFactcheck } from "./factcheckers";

export type IngestionSnapshot = {
  fetched_at: string;
  pipeline_version: string;
  sources: {
    count: number;
    by_politician: Record<string, number>;
    items: IngestedSource[];
  };
  factchecks: {
    count: number;
    items: IngestedFactcheck[];
  };
  errors: { source: string; message: string }[];
};

const PIPELINE_VERSION = "ingest-v0.3";

export async function runIngestion(): Promise<IngestionSnapshot> {
  const fetchedAt = new Date().toISOString();
  const sources: IngestedSource[] = [];
  const errors: IngestionSnapshot["errors"] = [];

  // --- Élysée (presidential speeches, communiqués) ---
  try {
    const elysee = await fetchElysee();
    sources.push(...elysee);
  } catch (e) {
    errors.push({ source: "elysee", message: (e as Error).message });
  }

  // --- Gouvernement.fr / info.gouv.fr (ministerial communiqués) ---
  try {
    const gov = await fetchGouvernement({ limitPerFeed: 30 });
    sources.push(...gov);
  } catch (e) {
    errors.push({ source: "gouvernement", message: (e as Error).message });
  }

  // --- NosDéputés.fr (Assemblée nationale interventions, ODbL) ---
  try {
    const nd = await fetchNosDéputes();
    sources.push(...nd.items);
    for (const err of nd.errors) {
      errors.push({ source: `nosdeputes:${err.deputy}`, message: err.message });
    }
  } catch (e) {
    errors.push({ source: "nosdeputes", message: (e as Error).message });
  }

  // --- Sénat (communiqués du Président du Sénat et groupe PS) ---
  try {
    const senat = await fetchSenat({ limitPerFeed: 30 });
    sources.push(...senat);
  } catch (e) {
    errors.push({ source: "senat", message: (e as Error).message });
  }

  // --- Factcheckers (AFP Factuel, Le Monde Vérificateur, etc.) ---
  let factchecks: IngestedFactcheck[] = [];
  try {
    const fc = await fetchFactchecks({ limitPerOutlet: 25 });
    factchecks = fc.items;
    for (const err of fc.errors) {
      errors.push({ source: `factcheckers:${err.outlet}`, message: err.message });
    }
  } catch (e) {
    errors.push({ source: "factcheckers", message: (e as Error).message });
  }

  // Dedup sources by id across all connectors (Élysée slugs are distinct
  // from gov-* and ndep-* prefixes so collisions only happen on retries).
  const seen = new Set<string>();
  const dedupedSources = sources.filter((s) => {
    if (seen.has(s.id)) return false;
    seen.add(s.id);
    return true;
  });

  const byPolitician: Record<string, number> = {};
  for (const s of dedupedSources) {
    byPolitician[s.politician_id] = (byPolitician[s.politician_id] ?? 0) + 1;
  }

  return {
    fetched_at: fetchedAt,
    pipeline_version: PIPELINE_VERSION,
    sources: {
      count: dedupedSources.length,
      by_politician: byPolitician,
      items: dedupedSources,
    },
    factchecks: {
      count: factchecks.length,
      items: factchecks,
    },
    errors,
  };
}
