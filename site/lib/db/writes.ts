// Insert / upsert helpers for ingested sources and extracted claims.
// Each function is idempotent on the natural key (raw_text_sha256 for
// sources, source_id + claim_normalized for claims).

import { getPool } from "./client";
import type { IngestedSource } from "@/lib/ingest/elysee";
import type { Claim as ExtractedClaim } from "@/lib/llm/schemas";

export type UpsertSourceResult = {
  source_id: string;
  inserted: boolean;
};

export async function upsertSource(
  src: IngestedSource,
  rawText: string,
): Promise<UpsertSourceResult> {
  const pool = getPool();
  const sha = await sha256(rawText);

  const polIdRes = await pool.query<{ id: string }>(
    "select id from politicians where slug = $1 limit 1",
    [polSlugFromFixtureId(src.politician_id)],
  );
  if (polIdRes.rows.length === 0) {
    throw new Error(
      `politician not found for fixture id ${src.politician_id} (slug ${polSlugFromFixtureId(src.politician_id)})`,
    );
  }
  const politicianUuid = polIdRes.rows[0].id;

  const res = await pool.query<{ id: string; xmax: string }>(
    `insert into sources (
       source_type, politician_id, occurred_at, url, raw_text,
       raw_text_sha256, language, channel, source_credibility, ingested_by_run_id
     ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     on conflict (raw_text_sha256) where raw_text_sha256 is not null and deleted_at is null
     do update set scraped_at = now()
     returning id, xmax::text`,
    [
      src.source_type,
      politicianUuid,
      src.occurred_at,
      src.url,
      rawText,
      sha,
      "fr",
      src.channel,
      5, // official source
      src.ingested_from,
    ],
  );
  return {
    source_id: res.rows[0].id,
    inserted: res.rows[0].xmax === "0",
  };
}

export type UpsertClaimsResult = {
  inserted: number;
  skipped_duplicate: number;
};

export async function insertClaims(
  sourceId: string,
  politicianFixtureId: string,
  claims: ExtractedClaim[],
  meta: { modelId: string; promptVersion: string },
): Promise<UpsertClaimsResult> {
  if (claims.length === 0) return { inserted: 0, skipped_duplicate: 0 };
  const pool = getPool();

  const polRes = await pool.query<{ id: string }>(
    "select id from politicians where slug = $1 limit 1",
    [polSlugFromFixtureId(politicianFixtureId)],
  );
  if (polRes.rows.length === 0) {
    throw new Error(`politician not found for fixture id ${politicianFixtureId}`);
  }
  const politicianUuid = polRes.rows[0].id;

  let inserted = 0;
  let skipped = 0;
  for (const c of claims) {
    const normalized = c.claim_normalized.trim().toLowerCase();
    const exists = await pool.query<{ id: string }>(
      `select id from claims
       where politician_id = $1 and claim_normalized = $2
         and deleted_at is null
       limit 1`,
      [politicianUuid, normalized],
    );
    if (exists.rows.length > 0) {
      skipped++;
      continue;
    }
    await pool.query(
      `insert into claims (
         source_id, politician_id, claim_text, claim_normalized,
         claim_type, topic_tags, numeric_values, named_entities,
         extraction_confidence, context_window,
         prompt_version, llm_model
       ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        sourceId,
        politicianUuid,
        c.claim_text,
        normalized,
        c.claim_type,
        c.topic_tags,
        JSON.stringify(c.numeric_values ?? []),
        JSON.stringify(c.named_entities ?? []),
        c.extraction_confidence,
        c.context_window ?? null,
        meta.promptVersion,
        meta.modelId,
      ],
    );
    inserted++;
  }
  return { inserted, skipped_duplicate: skipped };
}

// Maps a fixture id like "pol-macron" to its corresponding slug
// "emmanuel-macron". Static map for the 50 seeded politicians.
const FIXTURE_TO_SLUG: Record<string, string> = {
  "pol-macron": "emmanuel-macron",
  "pol-attal": "gabriel-attal",
  "pol-le-pen": "marine-le-pen",
  "pol-bardella": "jordan-bardella",
  "pol-melenchon": "jean-luc-melenchon",
  "pol-philippe": "edouard-philippe",
  "pol-bayrou": "francois-bayrou",
  "pol-marechal": "marion-marechal",
  "pol-faure": "olivier-faure",
  "pol-tondelier": "marine-tondelier",
  "pol-roussel": "fabien-roussel",
  "pol-wauquiez": "laurent-wauquiez",
  "pol-borne": "elisabeth-borne",
  "pol-le-maire": "bruno-le-maire",
  "pol-aubry": "manon-aubry",
  "pol-braun-pivet": "yael-braun-pivet",
  // Government
  "pol-retailleau": "bruno-retailleau",
  "pol-vautrin": "catherine-vautrin",
  "pol-dati": "rachida-dati",
  "pol-lecornu": "sebastien-lecornu",
  "pol-barrot": "jean-noel-barrot",
  // Mayors
  "pol-hidalgo": "anne-hidalgo",
  "pol-doucet": "gregory-doucet",
  "pol-payan": "benoit-payan",
  "pol-hurmic": "pierre-hurmic",
  "pol-rolland": "johanna-rolland",
  "pol-barseghian": "jeanne-barseghian",
  "pol-estrosi": "christian-estrosi",
  "pol-appere": "nathalie-appere",
  "pol-delafosse": "michael-delafosse",
  "pol-lisnard": "david-lisnard",
  // Regional
  "pol-pecresse": "valerie-pecresse",
  "pol-bertrand": "xavier-bertrand",
  "pol-delga": "carole-delga",
  "pol-muselier": "renaud-muselier",
  "pol-morancais": "christelle-morancais",
  "pol-rousset": "alain-rousset",
  "pol-morin": "herve-morin",
  "pol-simeoni": "gilles-simeoni",
  // Parliamentary
  "pol-panot": "mathilde-panot",
  "pol-chatelain": "cyrielle-chatelain",
  "pol-vallaud": "boris-vallaud",
  "pol-fesneau": "marc-fesneau",
  "pol-marcangeli": "laurent-marcangeli",
  "pol-larcher": "gerard-larcher",
  "pol-kanner": "patrick-kanner",
  // MEPs
  "pol-bellamy": "francois-xavier-bellamy",
  "pol-glucksmann": "raphael-glucksmann",
  "pol-hayer": "valerie-hayer",
  "pol-toussaint": "marie-toussaint",
};

function polSlugFromFixtureId(id: string): string {
  return FIXTURE_TO_SLUG[id] ?? id.replace(/^pol-/, "");
}

async function sha256(s: string): Promise<string> {
  const buf = new TextEncoder().encode(s);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
