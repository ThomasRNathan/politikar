// Server-only read queries against Neon. Used by Server Components
// (politician profile, homepage feed). Failures fall back gracefully —
// callers either receive an empty array or use the bundled JSON snapshot
// as a backup so the site never breaks because the DB is unreachable.

import { getSql } from "./client";

export type DbClaim = {
  id: string;
  claim_text: string;
  claim_type: string;
  topic_tags: string[];
  extraction_confidence: number;
  created_at: string;
  llm_model: string;
  prompt_version: string;
  source_url: string | null;
  source_channel: string | null;
  source_type: string | null;
  occurred_at: string | null;
};

export async function getClaimsForPolitician(
  slug: string,
  limit = 20,
): Promise<DbClaim[]> {
  try {
    const sql = getSql();
    const rows = (await sql`
      select
        c.id::text,
        c.claim_text,
        c.claim_type,
        c.topic_tags,
        c.extraction_confidence::float as extraction_confidence,
        c.created_at,
        c.llm_model,
        c.prompt_version,
        s.url as source_url,
        s.channel as source_channel,
        s.source_type,
        s.occurred_at
      from claims c
      join politicians p on p.id = c.politician_id
      left join sources s on s.id = c.source_id
      where p.slug = ${slug}
        and c.deleted_at is null
        and (c.duplicate_of_claim_id is null)
      order by s.occurred_at desc nulls last, c.created_at desc
      limit ${limit}
    `) as DbClaim[];
    return rows;
  } catch (e) {
    console.warn("getClaimsForPolitician failed:", (e as Error).message);
    return [];
  }
}

export type DbSourceSummary = {
  id: string;
  source_type: string;
  channel: string;
  occurred_at: string | null;
  url: string | null;
  politician_slug: string;
  politician_full_name: string;
  raw_text_preview: string;
  claims_count: number;
};

export async function getRecentDbSources(limit = 8): Promise<DbSourceSummary[]> {
  try {
    const sql = getSql();
    const rows = (await sql`
      select
        s.id::text,
        s.source_type,
        s.channel,
        s.occurred_at,
        s.url,
        p.slug as politician_slug,
        p.full_name as politician_full_name,
        left(coalesce(s.raw_text, ''), 200) as raw_text_preview,
        (select count(*) from claims c where c.source_id = s.id and c.deleted_at is null)::int as claims_count
      from sources s
      join politicians p on p.id = s.politician_id
      where s.deleted_at is null
      order by s.occurred_at desc nulls last, s.scraped_at desc
      limit ${limit}
    `) as DbSourceSummary[];
    return rows;
  } catch (e) {
    console.warn("getRecentDbSources failed:", (e as Error).message);
    return [];
  }
}

export type DbTotals = {
  politicians: number;
  sources: number;
  claims: number;
};

export async function getDbTotals(): Promise<DbTotals> {
  try {
    const sql = getSql();
    const rows = (await sql`
      select
        (select count(*) from politicians where deleted_at is null)::int as politicians,
        (select count(*) from sources where deleted_at is null)::int as sources,
        (select count(*) from claims where deleted_at is null)::int as claims
    `) as DbTotals[];
    return rows[0] ?? { politicians: 0, sources: 0, claims: 0 };
  } catch (e) {
    console.warn("getDbTotals failed:", (e as Error).message);
    return { politicians: 0, sources: 0, claims: 0 };
  }
}
