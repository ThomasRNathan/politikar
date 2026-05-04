// NosDéputés.fr connector. Open data, ODbL licence. Maintenu par
// Regards Citoyens.
//
// On fetche la fiche député + ses interventions parlementaires récentes.
// L'API JSON est documentée à https://www.nosdeputes.fr/api.

import { fetchJson, sleep, sha256Short } from "./util.mjs";

const BASE = "https://www.nosdeputes.fr";

// Map politikar IDs → NosDéputés slugs (only for those currently député
// in our cohort)
const SLUGS = {
  "pol-le-pen": "marine-le-pen",
  "pol-borne": "elisabeth-borne",
  "pol-melenchon": "jean-luc-melenchon",
  "pol-faure": "olivier-faure",
  "pol-roussel": "fabien-roussel",
  "pol-braun-pivet": "yael-braun-pivet",
  "pol-attal": "gabriel-attal",
};

export async function fetchNosDeputesInterventions({
  politicianId,
  limit = 12,
}) {
  const slug = SLUGS[politicianId];
  if (!slug) return [];

  let payload;
  try {
    payload = await fetchJson(
      `${BASE}/${slug}/interventions/json?limit=${limit}`
    );
  } catch (e) {
    console.warn(`nosdeputes: ${slug} interventions failed: ${e.message}`);
    return [];
  }
  const list = payload?.interventions ?? [];

  const out = [];
  for (const wrapper of list) {
    const i = wrapper.intervention ?? wrapper;
    if (!i) continue;
    const text = (i.intervention ?? "").replace(/<[^>]+>/g, " ").trim();
    if (!text || text.length < 40) continue;
    const date = i.date ?? null;
    const url =
      i.url_an ??
      (i.seance_id
        ? `${BASE}/16/seance/${i.seance_id}#inter_${i.id}`
        : null);
    const id = `nosdep-${sha256Short(`${slug}-${i.id ?? text.slice(0, 50)}`)}`;
    out.push({
      id,
      politician_id: politicianId,
      source_type: "parliamentary_intervention",
      channel: "Assemblée nationale (verbatim)",
      occurred_at: date ? new Date(date).toISOString() : null,
      url,
      title: truncate(text, 140),
      summary: truncate(text, 480),
      license: "ODbL",
      ingested_from: "nosdeputes.fr",
    });
  }
  await sleep(250);
  return out
    .sort((a, b) => (b.occurred_at ?? "").localeCompare(a.occurred_at ?? ""))
    .slice(0, limit);
}

function truncate(s, n) {
  if (!s) return "";
  if (s.length <= n) return s;
  return s.slice(0, n - 1).replace(/\s\S*$/, "") + "…";
}

export const NOSDEP_SLUGS = SLUGS;
