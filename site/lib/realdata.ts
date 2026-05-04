import sources from "@/data/ingested-sources.json";
import factchecks from "@/data/ingested-factchecks.json";

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

export type IngestedFactcheck = {
  id: string;
  outlet: string;
  title: string;
  summary: string | null;
  url: string;
  published_at: string | null;
  ingested_from: string;
};

type SourcesPayload = {
  fetched_at: string;
  pipeline_version: string;
  counts: { total: number; by_politician: Record<string, number> };
  sources: IngestedSource[];
  by_politician: Record<string, IngestedSource[]>;
  errors: { source: string; message: string }[];
};

type FactchecksPayload = {
  fetched_at: string;
  count: number;
  items: IngestedFactcheck[];
};

const sourcesPayload = sources as SourcesPayload;
const factchecksPayload = factchecks as FactchecksPayload;

export function realSourcesFor(politicianId: string): IngestedSource[] {
  return sourcesPayload.by_politician[politicianId] ?? [];
}

export function recentRealSources(limit = 8): IngestedSource[] {
  return [...sourcesPayload.sources]
    .sort((a, b) => (b.occurred_at ?? "").localeCompare(a.occurred_at ?? ""))
    .slice(0, limit);
}

export function recentFactchecks(limit = 12): IngestedFactcheck[] {
  return factchecksPayload.items.slice(0, limit);
}

export function ingestedAt(): string {
  return sourcesPayload.fetched_at;
}

export function ingestionTotals() {
  return {
    sources: sourcesPayload.counts.total,
    factchecks: factchecksPayload.count,
    by_politician: sourcesPayload.counts.by_politician,
  };
}
