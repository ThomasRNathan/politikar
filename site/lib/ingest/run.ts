// Ingestion orchestrator. Calls all connectors and returns a snapshot
// payload that can be persisted to disk (CLI script) or Vercel Blob
// (cron route handler). Pure function except for fetch() calls.

import { fetchElysee, type IngestedSource } from "./elysee";
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

const PIPELINE_VERSION = "ingest-v0.2";

export async function runIngestion(): Promise<IngestionSnapshot> {
  const fetchedAt = new Date().toISOString();
  const sources: IngestedSource[] = [];
  const errors: IngestionSnapshot["errors"] = [];

  try {
    const elysee = await fetchElysee();
    sources.push(...elysee);
  } catch (e) {
    errors.push({ source: "elysee", message: (e as Error).message });
  }

  // Other connectors (NosDéputés XVIIe, AN open data) will be wired here as
  // soon as Regards Citoyens publishes the new legislature data.

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

  const byPolitician: Record<string, number> = {};
  for (const s of sources) {
    byPolitician[s.politician_id] = (byPolitician[s.politician_id] ?? 0) + 1;
  }

  return {
    fetched_at: fetchedAt,
    pipeline_version: PIPELINE_VERSION,
    sources: {
      count: sources.length,
      by_politician: byPolitician,
      items: sources,
    },
    factchecks: {
      count: factchecks.length,
      items: factchecks,
    },
    errors,
  };
}
