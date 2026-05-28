// NosDéputés.fr connector — Regards Citoyens open API.
// License: Open Data Commons Open Database License (ODbL).
// https://www.nosdeputes.fr/api
//
// Fetches recent parliamentary interventions (speeches, questions) for a
// set of tracked deputies. Each intervention is treated as a Source with
// `source_type: "speech"` and `channel: "Assemblée nationale"`.
//
// API endpoint: https://www.nosdeputes.fr/{slug}/interventions/json
//   Optional query params: limit (default 20), offset
//   Response: { "interventions": [{ "intervention": { texte, date, ... } }] }
//
// Rate limit: be polite, 500 ms between requests.

import { sha256Short, sleep } from "./util";

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

type DeputySpec = {
  politician_id: string;
  /** Slug used by NosDéputés.fr (accents stripped, spaces as hyphens). */
  nosdeputes_slug: string;
  full_name: string;
};

// Deputies tracked via NosDéputés. Only current AN members are included —
// ministers who gave up their seat are NOT listed here.
export const TRACKED_DEPUTIES: DeputySpec[] = [
  { politician_id: "pol-le-pen",      nosdeputes_slug: "marine-le-pen",         full_name: "Marine Le Pen" },
  { politician_id: "pol-panot",       nosdeputes_slug: "mathilde-panot",         full_name: "Mathilde Panot" },
  { politician_id: "pol-vallaud",     nosdeputes_slug: "boris-vallaud",          full_name: "Boris Vallaud" },
  { politician_id: "pol-chatelain",   nosdeputes_slug: "cyrielle-chatelain",     full_name: "Cyrielle Chatelain" },
  { politician_id: "pol-marcangeli",  nosdeputes_slug: "laurent-marcangeli",     full_name: "Laurent Marcangeli" },
  { politician_id: "pol-braun-pivet", nosdeputes_slug: "yael-braun-pivet",       full_name: "Yaël Braun-Pivet" },
  { politician_id: "pol-aubry",       nosdeputes_slug: "julien-bayou",           full_name: "Julien Bayou" },   // fallback if aubry not deputy
];

const BASE = "https://www.nosdeputes.fr";
const LIMIT = 10; // interventions per deputy per run

type RawIntervention = {
  texte?: string;
  date?: string;
  seance_id?: string;
  type?: string;
  paragraph_id?: string;
  id?: string | number;
  [key: string]: unknown;
};

type RawWrapper = { intervention?: RawIntervention; [key: string]: unknown };

async function fetchDeputyInterventions(spec: DeputySpec): Promise<IngestedSource[]> {
  const url = `${BASE}/${spec.nosdeputes_slug}/interventions/json?limit=${LIMIT}`;
  let data: unknown;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "politikar/0.1 (+https://politikar.vercel.app; thomasrnathan@gmail.com)" },
      cache: "no-store",
    });
    if (!res.ok) {
      // 404 = deputy not found in current legislature — skip silently
      if (res.status === 404) return [];
      console.warn(`nosdeputes ${spec.nosdeputes_slug} → HTTP ${res.status}`);
      return [];
    }
    data = await res.json();
  } catch (e) {
    console.warn(`nosdeputes fetch failed for ${spec.nosdeputes_slug}: ${(e as Error).message}`);
    return [];
  }

  // API response shape: { "interventions": [ { "intervention": { ... } } ] }
  // or sometimes: { "interventions": [ { "texte": "...", ... } ] }
  const rawList = (data as { interventions?: unknown[] }).interventions;
  if (!Array.isArray(rawList) || rawList.length === 0) return [];

  const out: IngestedSource[] = [];
  for (const wrapper of rawList) {
    const w = wrapper as RawWrapper;
    const item: RawIntervention = (w.intervention as RawIntervention | undefined) ?? (w as RawIntervention);

    const texte = typeof item.texte === "string" ? item.texte.trim() : null;
    if (!texte || texte.length < 40) continue;

    const rawDate = typeof item.date === "string" ? item.date : null;
    const occurredAt = rawDate ? new Date(rawDate).toISOString() : null;
    const itemId = item.id ?? item.paragraph_id ?? item.seance_id ?? texte.slice(0, 20);
    const id = `ndep-${sha256Short(`${spec.nosdeputes_slug}-${String(itemId)}`)}`;

    // Canonical URL for a séance — deep-linking into NosDéputés session.
    const seanceUrl = item.seance_id
      ? `${BASE}/seance/${item.seance_id}#${item.paragraph_id ?? ""}`
      : `${BASE}/${spec.nosdeputes_slug}`;

    // Summarise long interventions for the `summary` field.
    const summary = texte.length > 400 ? texte.slice(0, 397) + "…" : texte;

    out.push({
      id,
      politician_id: spec.politician_id,
      source_type: "speech",
      channel: "Assemblée nationale",
      occurred_at: occurredAt,
      url: seanceUrl,
      title: `Intervention de ${spec.full_name} à l'Assemblée nationale`,
      summary,
      license: "ODbL (NosDéputés.fr)",
      ingested_from: url,
    });
  }
  return out;
}

export type FetchResult = {
  items: IngestedSource[];
  errors: { deputy: string; message: string }[];
};

/**
 * Fetch recent interventions for all tracked deputies. Politely paced
 * at 500 ms between each HTTP request.
 */
export async function fetchNosDéputes(
  { deputies = TRACKED_DEPUTIES }: { deputies?: DeputySpec[] } = {},
): Promise<FetchResult> {
  const items: IngestedSource[] = [];
  const errors: { deputy: string; message: string }[] = [];

  for (let i = 0; i < deputies.length; i++) {
    if (i > 0) await sleep(500);
    const spec = deputies[i];
    try {
      const rows = await fetchDeputyInterventions(spec);
      items.push(...rows);
    } catch (e) {
      errors.push({ deputy: spec.nosdeputes_slug, message: (e as Error).message });
    }
  }

  items.sort((a, b) => (b.occurred_at ?? "").localeCompare(a.occurred_at ?? ""));
  return { items, errors };
}
