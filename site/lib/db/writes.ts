// Insert / upsert helpers for ingested sources and extracted claims.
// Each function is idempotent on the natural key (raw_text_sha256 for
// sources, source_id + claim_normalized for claims).

import { getPool } from "./client";
import { POLITICIANS } from "@/lib/fixtures";
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

// Maps a fixture id like "pol-macron" to its DB slug "emmanuel-macron".
// Derived from the fixtures so it never drifts as politicians are added —
// fixtures.ts is the single source of truth for the referential.
const FIXTURE_TO_SLUG: Record<string, string> = Object.fromEntries(
  POLITICIANS.map((p) => [p.id, p.slug]),
);

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
