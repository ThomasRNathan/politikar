// Real TruthScore computation from published verdicts.
//
// getScoringRows() pulls one row per claim that has an active PUBLISHED
// verdict (what we stand behind publicly), joined with the metadata the
// scoring formula needs. recomputeAllTruthScores() runs the v1.0.0 engine
// per politician and overwrites politician_truth_scores with REAL values —
// wiping the illustrative seed. Politicians with no resolved verdicts get a
// null score (honest "not enough data" state).

import { cache } from "react";
import { getPool, getSql } from "./client";
import { computeTruthScore, SCORING_VERSION, type ScoringClaim, type TruthScoreResult } from "@/lib/scoring";
import type { Politician } from "@/lib/types";

type ScoringRow = ScoringClaim & { politician_id: string };

export async function getScoringRows(): Promise<ScoringRow[]> {
  const pool = getPool();
  const { rows } = await pool.query<{
    politician_id: string;
    claim_type: string;
    topic_tags: string[] | null;
    has_numeric: boolean;
    confidence: number;
    source_credibility: number;
    verdict: string;
    is_human_reviewed: boolean;
  }>(`
    select
      c.politician_id::text as politician_id,
      c.claim_type,
      c.topic_tags,
      (jsonb_array_length(coalesce(c.numeric_values, '[]'::jsonb)) > 0) as has_numeric,
      coalesce(c.extraction_confidence, 0.5)::float as confidence,
      coalesce(s.source_credibility, 3) as source_credibility,
      v.verdict,
      coalesce(v.human_reviewed, false) as is_human_reviewed
    from claims c
    join politicians p on p.id = c.politician_id
    left join sources s on s.id = c.source_id
    join lateral (
      select verdict, human_reviewed
      from verifications v
      where v.claim_id = c.id
        and v.is_published
        and v.superseded_by_verification_id is null
      order by v.created_at desc
      limit 1
    ) v on true
    where c.deleted_at is null
      and c.duplicate_of_claim_id is null
  `);
  return rows.map((r) => ({
    politician_id: r.politician_id,
    claim_type: r.claim_type,
    topic_tags: r.topic_tags ?? [],
    has_numeric: r.has_numeric,
    confidence: r.confidence,
    politician_tier: "", // filled from politicians below
    source_credibility: r.source_credibility,
    verdict: r.verdict,
    is_human_reviewed: r.is_human_reviewed,
  }));
}

export type RecomputeReport = {
  politicians_total: number;
  with_resolved_claims: number;
  significant: number;
  scored: number; // non-null truth_score
  updated_rows: number;
};

/** Recompute every politician's real TruthScore and persist it, replacing
 * the illustrative seed. Returns a summary. */
export async function recomputeAllTruthScores(): Promise<RecomputeReport> {
  const pool = getPool();

  // Every politician (so we can null-out illustrative scores for those with
  // no resolved verdicts), with their tier.
  const { rows: pols } = await pool.query<{ id: string; tier: string }>(
    `select id::text, coalesce(tier, 'P2') as tier from politicians where deleted_at is null`,
  );
  const tierById = new Map(pols.map((p) => [p.id, p.tier]));

  const rows = await getScoringRows();
  const byPol = new Map<string, ScoringClaim[]>();
  for (const r of rows) {
    r.politician_tier = tierById.get(r.politician_id) ?? "P2";
    let bucket = byPol.get(r.politician_id);
    if (!bucket) {
      bucket = [];
      byPol.set(r.politician_id, bucket);
    }
    bucket.push(r);
  }

  const report: RecomputeReport = {
    politicians_total: pols.length,
    with_resolved_claims: byPol.size,
    significant: 0,
    scored: 0,
    updated_rows: 0,
  };

  for (const pol of pols) {
    const claims = byPol.get(pol.id) ?? [];
    const s: TruthScoreResult = computeTruthScore(claims);
    if (s.is_significant) report.significant++;
    if (s.truth_score !== null) report.scored++;
    await pool.query(
      `insert into politician_truth_scores (
         politician_id, truth_score, factual_score, promise_score,
         transparency_score, ci_low, ci_high, topic_breakdown,
         is_significant, scoring_version, computed_at
       ) values ($1,$2,$3,$4,$5,$6,$7,'{}'::jsonb,$8,$9, now())
       on conflict (politician_id) do update set
         truth_score = excluded.truth_score,
         factual_score = excluded.factual_score,
         promise_score = excluded.promise_score,
         transparency_score = excluded.transparency_score,
         ci_low = excluded.ci_low,
         ci_high = excluded.ci_high,
         topic_breakdown = excluded.topic_breakdown,
         is_significant = excluded.is_significant,
         scoring_version = excluded.scoring_version,
         computed_at = now()`,
      [
        pol.id,
        s.truth_score,
        s.factual_score,
        s.promise_score,
        s.transparency_score,
        s.ci_low,
        s.ci_high,
        s.is_significant,
        SCORING_VERSION,
      ],
    );
    report.updated_rows++;
  }

  return report;
}

export type DbTruthScore = {
  slug: string;
  truth_score: number | null;
  factual_score: number | null;
  promise_score: number | null;
  transparency_score: number | null;
  ci_low: number | null;
  ci_high: number | null;
  is_significant: boolean;
  n_factual: number;
  n_promises: number;
  computed_at: string | null;
};

/** Persisted real scores for every politician, keyed by slug. Only rows that
 * have actually been recomputed are included (computed_at not null) — callers
 * treat a missing slug as "no data yet". Cached per request so the profile
 * headline and its peer cards share a single query. */
export const getRealScoreMap = cache(async (): Promise<Map<string, DbTruthScore>> => {
  const map = new Map<string, DbTruthScore>();
  try {
    const sql = getSql();
    const rows = (await sql`
      select
        p.slug,
        ts.truth_score::float as truth_score,
        ts.factual_score::float as factual_score,
        ts.promise_score::float as promise_score,
        ts.transparency_score::float as transparency_score,
        ts.ci_low::float as ci_low,
        ts.ci_high::float as ci_high,
        coalesce(ts.is_significant, false) as is_significant,
        ts.computed_at,
        (select count(*) from claims c
           join verifications v on v.claim_id = c.id
          where c.politician_id = p.id and c.claim_type = 'factual_assertion'
            and v.is_published and v.superseded_by_verification_id is null
            and c.deleted_at is null)::int as n_factual,
        (select count(*) from claims c
           join verifications v on v.claim_id = c.id
          where c.politician_id = p.id and c.claim_type = 'promise'
            and v.is_published and v.superseded_by_verification_id is null
            and c.deleted_at is null)::int as n_promises
      from politicians p
      left join politician_truth_scores ts on ts.politician_id = p.id
      where p.deleted_at is null
    `) as DbTruthScore[];
    for (const r of rows) {
      if (r.computed_at !== null) map.set(r.slug, r);
    }
  } catch (e) {
    console.warn("getRealScoreMap failed:", (e as Error).message);
  }
  return map;
});

/** Real score for one politician (by slug), or null if not computed yet. */
export async function getRealTruthScore(slug: string): Promise<DbTruthScore | null> {
  return (await getRealScoreMap()).get(slug) ?? null;
}

/** Overlay real scores onto a fixture politician for card/list rendering.
 * Displayed truth_score / CI are gated by significance (like the profile);
 * politicians without a significant real row render an honest empty state. */
export function withRealStats(p: Politician, map: Map<string, DbTruthScore>): Politician {
  const r = map.get(p.slug);
  const sig = r?.is_significant ?? false;
  return {
    ...p,
    stats: {
      truth_score: sig ? r?.truth_score ?? null : null,
      factual_score: r?.factual_score ?? null,
      promise_score: r?.promise_score ?? null,
      transparency_score: r?.transparency_score ?? 50,
      ci_low: sig ? r?.ci_low ?? null : null,
      ci_high: sig ? r?.ci_high ?? null : null,
      is_significant: sig,
      n_factual: r?.n_factual ?? 0,
      n_promises: r?.n_promises ?? 0,
      topic_breakdown: {},
    },
  };
}

/** Convenience: overlay real scores onto a list, preserving order. */
export function withRealStatsList(
  politicians: Politician[],
  map: Map<string, DbTruthScore>,
): Politician[] {
  return politicians.map((p) => withRealStats(p, map));
}
