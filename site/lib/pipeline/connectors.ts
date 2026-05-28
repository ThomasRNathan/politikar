// Connector registry — one entry per source connector.
//
// Each ConnectorSpec ties a fetch function to the politician metadata
// needed by the extraction and verification prompts. The pipeline
// iterates this registry every cron run, fetching fresh items from each
// source and routing them to the correct politician.
//
// To add a new politician + source:
//   1. Add their fixture ID in lib/fixtures.ts (if not already there).
//   2. Add a ConnectorSpec below.
//   3. If a new ingest function is needed, create lib/ingest/newconnector.ts.

import { fetchElysee, fetchArticleBody, type IngestedSource } from "@/lib/ingest/elysee";
import { fetchGouvernement, fetchGouvernementBody } from "@/lib/ingest/gouvernement";
import { fetchNosDéputes, TRACKED_DEPUTIES } from "@/lib/ingest/nosdeputes";

export type PoliticianMeta = {
  id: string;        // fixture politician id, e.g. "pol-macron"
  full_name: string;
  function_name: string;
  party: string;
  tier: "P0" | "P1";
};

// Lookup for politician metadata used by the extraction/verification prompts.
// Must cover every politician that any connector can produce.
export const POLITICIAN_META: Record<string, PoliticianMeta> = {
  "pol-macron":      { id: "pol-macron",      full_name: "Emmanuel Macron",    function_name: "Président de la République", party: "Renaissance",        tier: "P0" },
  "pol-attal":       { id: "pol-attal",        full_name: "Gabriel Attal",      function_name: "Ancien Premier ministre",    party: "Renaissance",        tier: "P0" },
  "pol-bayrou":      { id: "pol-bayrou",       full_name: "François Bayrou",    function_name: "Premier ministre",           party: "MoDem",              tier: "P0" },
  "pol-lecornu":     { id: "pol-lecornu",      full_name: "Sébastien Lecornu",  function_name: "Ministre des Armées",        party: "Horizons",           tier: "P0" },
  "pol-retailleau":  { id: "pol-retailleau",   full_name: "Bruno Retailleau",   function_name: "Ministre de l'Intérieur",    party: "Les Républicains",   tier: "P0" },
  "pol-vautrin":     { id: "pol-vautrin",      full_name: "Catherine Vautrin",  function_name: "Ministre du Travail",        party: "Horizons",           tier: "P1" },
  "pol-barrot":      { id: "pol-barrot",       full_name: "Jean-Noël Barrot",   function_name: "Ministre des AE",            party: "MoDem",              tier: "P1" },
  "pol-dati":        { id: "pol-dati",         full_name: "Rachida Dati",       function_name: "Ministre de la Culture",     party: "Les Républicains",   tier: "P1" },
  "pol-le-maire":    { id: "pol-le-maire",     full_name: "Bruno Le Maire",     function_name: "Ancien Ministre des Finances", party: "Renaissance",      tier: "P0" },
  "pol-borne":       { id: "pol-borne",        full_name: "Élisabeth Borne",    function_name: "Ancienne Première ministre", party: "Renaissance",        tier: "P0" },
  "pol-fesneau":     { id: "pol-fesneau",      full_name: "Marc Fesneau",       function_name: "Ministre de l'Agriculture",  party: "MoDem",              tier: "P1" },
  "pol-le-pen":      { id: "pol-le-pen",       full_name: "Marine Le Pen",      function_name: "Députée, Présidente du groupe RN", party: "Rassemblement national", tier: "P0" },
  "pol-panot":       { id: "pol-panot",        full_name: "Mathilde Panot",     function_name: "Présidente du groupe LFI",   party: "La France insoumise", tier: "P0" },
  "pol-vallaud":     { id: "pol-vallaud",      full_name: "Boris Vallaud",      function_name: "Président du groupe PS",     party: "Parti socialiste",   tier: "P0" },
  "pol-chatelain":   { id: "pol-chatelain",    full_name: "Cyrielle Chatelain", function_name: "Présidente du groupe Verts", party: "Les Écologistes",    tier: "P1" },
  "pol-marcangeli":  { id: "pol-marcangeli",   full_name: "Laurent Marcangeli", function_name: "Président du groupe HOR",    party: "Horizons",           tier: "P1" },
  "pol-braun-pivet": { id: "pol-braun-pivet",  full_name: "Yaël Braun-Pivet",   function_name: "Présidente de l'AN",         party: "Renaissance",        tier: "P0" },
  "pol-aubry":       { id: "pol-aubry",        full_name: "Olivier Faure",      function_name: "Premier secrétaire PS",      party: "Parti socialiste",   tier: "P0" },
};

export type ConnectorBatch = {
  sources: IngestedSource[];
  meta: PoliticianMeta;
  /** Optional: fetch article body given a source URL. */
  fetchBody?: (url: string) => Promise<string | null>;
};

/** Fetch all sources from all connectors. */
export async function fetchAllSources(): Promise<ConnectorBatch[]> {
  const batches: ConnectorBatch[] = [];

  // --- Élysée (Macron) ---
  try {
    const sources = await fetchElysee({ politicianId: "pol-macron" });
    batches.push({
      sources,
      meta: POLITICIAN_META["pol-macron"],
      fetchBody: fetchArticleBody,
    });
  } catch (e) {
    console.warn("connector:elysee failed:", (e as Error).message);
  }

  // --- Gouvernement.fr (ministers) ---
  // Returns sources already tagged with politician_id; we group by politician.
  try {
    const sources = await fetchGouvernement({ limitPerFeed: 50 });
    // Group by politician_id so each batch has homogeneous metadata.
    const byPol: Record<string, IngestedSource[]> = {};
    for (const s of sources) {
      (byPol[s.politician_id] ??= []).push(s);
    }
    for (const [polId, srcs] of Object.entries(byPol)) {
      const meta = POLITICIAN_META[polId];
      if (!meta) continue;
      batches.push({ sources: srcs, meta, fetchBody: fetchGouvernementBody });
    }
  } catch (e) {
    console.warn("connector:gouvernement failed:", (e as Error).message);
  }

  // --- NosDéputés (AN deputies) ---
  try {
    const { items, errors } = await fetchNosDéputes({ deputies: TRACKED_DEPUTIES });
    if (errors.length > 0) {
      console.warn("nosdeputes partial errors:", errors.map((e) => `${e.deputy}: ${e.message}`).join(", "));
    }
    const byPol: Record<string, IngestedSource[]> = {};
    for (const s of items) {
      (byPol[s.politician_id] ??= []).push(s);
    }
    for (const [polId, srcs] of Object.entries(byPol)) {
      const meta = POLITICIAN_META[polId];
      if (!meta) continue;
      // NosDéputés items already contain full text in summary;
      // no separate body fetch needed.
      batches.push({ sources: srcs, meta });
    }
  } catch (e) {
    console.warn("connector:nosdeputes failed:", (e as Error).message);
  }

  return batches;
}
