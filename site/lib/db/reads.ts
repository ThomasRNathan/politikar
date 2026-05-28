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
  // Live verdict from the verification cascade. Null when the claim
  // hasn't been verified yet or when the verdict is still pending review.
  verdict: string | null;
  verdict_confidence: number | null;
  verdict_reasoning: string | null;
  verdict_is_published: boolean;
  verdict_human_reviewed: boolean;
};

export async function getClaimsForPolitician(
  slug: string,
  limit = 20,
): Promise<DbClaim[]> {
  try {
    const sql = getSql();
    // Only published verifications surface on the public page. Claims
    // whose verdict landed in claim_review_queue render with a "pending
    // review" badge instead of a verdict pill.
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
        s.occurred_at,
        v.verdict,
        v.confidence_score::float as verdict_confidence,
        v.reasoning as verdict_reasoning,
        coalesce(v.is_published, false) as verdict_is_published,
        coalesce(v.human_reviewed, false) as verdict_human_reviewed
      from claims c
      join politicians p on p.id = c.politician_id
      left join sources s on s.id = c.source_id
      left join lateral (
        select v.verdict, v.confidence_score, v.reasoning,
               v.is_published, v.human_reviewed
        from verifications v
        where v.claim_id = c.id
          and v.superseded_by_verification_id is null
        order by v.created_at desc
        limit 1
      ) v on true
      where p.slug = ${slug}
        and c.deleted_at is null
        and c.duplicate_of_claim_id is null
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
  verifications_published: number;
  verdicts_true: number;
};

export async function getDbTotals(): Promise<DbTotals> {
  try {
    const sql = getSql();
    const rows = (await sql`
      select
        (select count(*) from politicians where deleted_at is null)::int as politicians,
        (select count(*) from sources where deleted_at is null)::int as sources,
        (select count(*) from claims where deleted_at is null)::int as claims,
        (select count(*) from verifications
           where is_published and superseded_by_verification_id is null)::int
          as verifications_published,
        (select count(*) from verifications
           where is_published and superseded_by_verification_id is null
             and verdict in ('true', 'mostly_true'))::int
          as verdicts_true
    `) as DbTotals[];
    return rows[0] ?? {
      politicians: 0,
      sources: 0,
      claims: 0,
      verifications_published: 0,
      verdicts_true: 0,
    };
  } catch (e) {
    console.warn("getDbTotals failed:", (e as Error).message);
    return {
      politicians: 0,
      sources: 0,
      claims: 0,
      verifications_published: 0,
      verdicts_true: 0,
    };
  }
}

export type LatestVerdict = {
  claim_id: string;
  claim_text: string;
  verdict: string;
  confidence: number;
  politician: string;
  politician_slug: string;
  source_url: string | null;
  created_at: string;
} | null;

export type DbVerdictDistribution = {
  verdict: string;
  count: number;
}[];

/** Per-verdict count for published, non-superseded verifications.
 * Used by /api/stats and the homepage ranking. */
export async function getVerdictDistribution(): Promise<DbVerdictDistribution> {
  try {
    const sql = getSql();
    const rows = (await sql`
      select v.verdict, count(*)::int as count
      from verifications v
      where v.is_published and v.superseded_by_verification_id is null
        and v.verdict != 'unverifiable'
      group by v.verdict
      order by count desc
    `) as DbVerdictDistribution;
    return rows;
  } catch (e) {
    console.warn("getVerdictDistribution failed:", (e as Error).message);
    return [];
  }
}

// --------- Real TruthScore computed from DB verifications ----------

const TRUTH_WEIGHTS: Record<string, number> = {
  true: 100,
  mostly_true: 80,
  mixed: 50,
  misleading_context: 35,
  mostly_false: 20,
  false: 0,
  unverifiable: 50, // neutral
};

export type DbRealScore = {
  truth_score: number;
  factual_score: number;
  n_verdicts: number;
  n_published: number;
  is_significant: boolean;
  verdict_counts: Record<string, number>;
};

/**
 * Compute a real TruthScore for a politician from their published DB
 * verifications. Returns null when the DB is unreachable or when the
 * politician has no data yet.
 *
 * Minimum volume threshold: 10 published verdicts before the score is
 * flagged as significant (lower than the public threshold of 30 so that
 * early pipeline runs show something useful).
 */
export async function getRealScoreForPolitician(
  slug: string,
): Promise<DbRealScore | null> {
  try {
    const sql = getSql();
    const rows = (await sql`
      select v.verdict, v.confidence_score::float as confidence
      from verifications v
      join claims c on c.id = v.claim_id
      join politicians p on p.id = c.politician_id
      where p.slug = ${slug}
        and v.is_published
        and v.superseded_by_verification_id is null
        and c.deleted_at is null
    `) as { verdict: string; confidence: number }[];

    if (rows.length === 0) return null;

    const verdictCounts: Record<string, number> = {};
    let weightedSum = 0;
    let totalWeight = 0;

    for (const r of rows) {
      verdictCounts[r.verdict] = (verdictCounts[r.verdict] ?? 0) + 1;
      const score = TRUTH_WEIGHTS[r.verdict] ?? 50;
      const w = r.confidence;
      weightedSum += score * w;
      totalWeight += w;
    }

    const truthScore = totalWeight > 0
      ? Math.round(weightedSum / totalWeight)
      : 50;

    // Factual score: same formula but excluding unverifiable
    const factualRows = rows.filter((r) => r.verdict !== "unverifiable");
    let fWeightedSum = 0, fTotalWeight = 0;
    for (const r of factualRows) {
      const score = TRUTH_WEIGHTS[r.verdict] ?? 50;
      fWeightedSum += score * r.confidence;
      fTotalWeight += r.confidence;
    }
    const factualScore = fTotalWeight > 0
      ? Math.round(fWeightedSum / fTotalWeight)
      : truthScore;

    return {
      truth_score: truthScore,
      factual_score: factualScore,
      n_verdicts: rows.length,
      n_published: rows.length,
      is_significant: rows.length >= 10,
      verdict_counts: verdictCounts,
    };
  } catch (e) {
    console.warn(`getRealScoreForPolitician(${slug}) failed:`, (e as Error).message);
    return null;
  }
}

/** Most recently published non-unverifiable verdict, for the "Pipeline
 * live" callout on the homepage and /methode page. */
export async function getLatestPublishedVerdict(): Promise<LatestVerdict> {
  try {
    const sql = getSql();
    const rows = (await sql`
      select
        c.id::text as claim_id,
        c.claim_text,
        v.verdict,
        v.confidence_score::float as confidence,
        p.full_name as politician,
        p.slug as politician_slug,
        s.url as source_url,
        v.created_at
      from verifications v
      join claims c on c.id = v.claim_id
      join politicians p on p.id = c.politician_id
      left join sources s on s.id = c.source_id
      where v.is_published
        and v.superseded_by_verification_id is null
        and v.verdict != 'unverifiable'
      order by v.created_at desc
      limit 1
    `) as Array<NonNullable<LatestVerdict>>;
    return rows[0] ?? null;
  } catch (e) {
    console.warn("getLatestPublishedVerdict failed:", (e as Error).message);
    return null;
  }
}

// --------- Claim detail page ----------

export type DbClaimDetail = {
  id: string;
  claim_text: string;
  claim_type: string;
  topic_tags: string[];
  // Published verification
  verdict: string;
  confidence_score: number;
  reasoning: string;
  evidence: Array<{
    source_url: string;
    source_label: string;
    quote: string;
    weight: number;
    kind: string;
  }>;
  human_reviewed: boolean;
  // Politician
  politician_slug: string;
  politician_full_name: string;
  politician_photo_url: string | null;
  // Source
  channel: string | null;
  source_url: string | null;
  occurred_at: string | null;
  // Provenance
  llm_model: string;
  prompt_version: string;
};

/**
 * Fetch a single claim by its UUID, joining its published verification.
 * Returns null if the claim doesn't exist, has no published verdict, or
 * the DB is unreachable.
 */
export async function getClaimById(id: string): Promise<DbClaimDetail | null> {
  try {
    const sql = getSql();
    const rows = (await sql`
      select
        c.id::text,
        c.claim_text,
        c.claim_type,
        c.topic_tags,
        v.verdict,
        v.confidence_score::float,
        v.reasoning,
        coalesce(v.evidence::text, '[]') as evidence,
        coalesce(v.human_reviewed, false) as human_reviewed,
        p.slug as politician_slug,
        p.full_name as politician_full_name,
        p.photo_url as politician_photo_url,
        s.channel,
        s.url as source_url,
        s.occurred_at,
        c.llm_model,
        c.prompt_version
      from claims c
      join politicians p on p.id = c.politician_id
      left join sources s on s.id = c.source_id
      left join lateral (
        select v.verdict, v.confidence_score, v.reasoning,
               v.evidence, v.human_reviewed
        from verifications v
        where v.claim_id = c.id
          and v.is_published
          and v.superseded_by_verification_id is null
        order by v.created_at desc
        limit 1
      ) v on true
      where c.id::text = ${id}
        and c.deleted_at is null
        and v.verdict is not null
      limit 1
    `) as Array<Omit<DbClaimDetail, "evidence"> & { evidence: string }>;

    if (rows.length === 0) return null;
    const row = rows[0];
    return {
      ...row,
      evidence: JSON.parse(row.evidence) as DbClaimDetail["evidence"],
    };
  } catch (e) {
    console.warn(`getClaimById(${id}) failed:`, (e as Error).message);
    return null;
  }
}

// --------- Homepage feed: recent published verdicts ----------

export type HomepageVerdict = {
  claim_id: string;
  claim_text: string;
  claim_type: string;
  verdict: string;
  confidence: number;
  reasoning: string | null;
  topic_tags: string[];
  politician_slug: string;
  politician_full_name: string;
  politician_photo_url: string | null;
  party_color: string | null;
  channel: string | null;
  occurred_at: string | null;
};

/**
 * Fetch the most recently published verdicts for the homepage feed.
 * Returns up to `limit` items ordered by verification creation date desc.
 * Falls back to [] on DB failure so the homepage always renders.
 */
export async function getRecentPublishedVerdicts(
  limit = 6,
): Promise<HomepageVerdict[]> {
  try {
    const sql = getSql();
    const rows = (await sql`
      select
        c.id::text as claim_id,
        c.claim_text,
        c.claim_type,
        c.topic_tags,
        v.verdict,
        v.confidence_score::float as confidence,
        left(v.reasoning, 280) as reasoning,
        p.slug as politician_slug,
        p.full_name as politician_full_name,
        p.photo_url as politician_photo_url,
        pa.color_hex as party_color,
        s.channel,
        s.occurred_at
      from verifications v
      join claims c on c.id = v.claim_id
      join politicians p on p.id = c.politician_id
      left join parties pa on pa.id = p.current_party_id
      left join sources s on s.id = c.source_id
      where v.is_published
        and v.superseded_by_verification_id is null
        and v.verdict != 'unverifiable'
        and c.deleted_at is null
      order by v.created_at desc
      limit ${limit}
    `) as HomepageVerdict[];
    return rows;
  } catch (e) {
    console.warn("getRecentPublishedVerdicts failed:", (e as Error).message);
    return [];
  }
}

// --------- Homepage ranking: top politicians by real truth score ----------

export type DbRankedPolitician = {
  slug: string;
  full_name: string;
  photo_url: string | null;
  party_color: string | null;
  truth_score: number;
  n_verdicts: number;
};

export type DbClassementRow = {
  slug: string;
  full_name: string;
  photo_url: string | null;
  party_color: string | null;
  truth_score: number;
  n_verdicts: number;
  // Verdict breakdown counts
  n_true: number;
  n_mostly_true: number;
  n_mixed: number;
  n_misleading: number;
  n_mostly_false: number;
  n_false: number;
  n_unverifiable: number;
};

/**
 * Full classement: all politicians with published verdicts, ranked by
 * confidence-weighted TruthScore with per-verdict breakdown counts.
 * Used by the /classement page.
 */
export async function getClassementData(
  minVerdicts = 1,
): Promise<DbClassementRow[]> {
  try {
    const sql = getSql();
    const rows = (await sql`
      select
        p.slug,
        p.full_name,
        p.photo_url,
        pa.color_hex as party_color,
        count(*)::int as n_verdicts,
        round(
          sum(
            v.confidence_score::float *
            case v.verdict
              when 'true'               then 100
              when 'mostly_true'        then 80
              when 'mixed'              then 50
              when 'misleading_context' then 35
              when 'mostly_false'       then 20
              when 'false'              then 0
              when 'unverifiable'       then 50
              else 50
            end
          ) / nullif(sum(v.confidence_score::float), 0)
        )::int as truth_score,
        count(*) filter (where v.verdict = 'true')::int          as n_true,
        count(*) filter (where v.verdict = 'mostly_true')::int   as n_mostly_true,
        count(*) filter (where v.verdict = 'mixed')::int         as n_mixed,
        count(*) filter (where v.verdict = 'misleading_context')::int as n_misleading,
        count(*) filter (where v.verdict = 'mostly_false')::int  as n_mostly_false,
        count(*) filter (where v.verdict = 'false')::int         as n_false,
        count(*) filter (where v.verdict = 'unverifiable')::int  as n_unverifiable
      from verifications v
      join claims c on c.id = v.claim_id
      join politicians p on p.id = c.politician_id
      left join parties pa on pa.id = p.current_party_id
      where v.is_published
        and v.superseded_by_verification_id is null
        and c.deleted_at is null
      group by p.id, p.slug, p.full_name, p.photo_url, pa.color_hex
      having count(*) >= ${minVerdicts}
      order by truth_score desc
    `) as DbClassementRow[];
    return rows;
  } catch (e) {
    console.warn("getClassementData failed:", (e as Error).message);
    return [];
  }
}

/**
 * Return top N politicians ranked by confidence-weighted TruthScore from
 * published DB verifications. Requires at least `minVerdicts` to appear.
 * Falls back to [] on DB failure — caller uses fixture top list instead.
 */
export async function getTopPoliticiansByScore(
  limit = 5,
  minVerdicts = 3,
): Promise<DbRankedPolitician[]> {
  try {
    const sql = getSql();
    const rows = (await sql`
      select
        p.slug,
        p.full_name,
        p.photo_url,
        pa.color_hex as party_color,
        count(*)::int as n_verdicts,
        round(
          sum(
            v.confidence_score::float *
            case v.verdict
              when 'true'               then 100
              when 'mostly_true'        then 80
              when 'mixed'              then 50
              when 'misleading_context' then 35
              when 'mostly_false'       then 20
              when 'false'              then 0
              when 'unverifiable'       then 50
              else 50
            end
          ) / nullif(sum(v.confidence_score::float), 0)
        )::int as truth_score
      from verifications v
      join claims c on c.id = v.claim_id
      join politicians p on p.id = c.politician_id
      left join parties pa on pa.id = p.current_party_id
      where v.is_published
        and v.superseded_by_verification_id is null
        and c.deleted_at is null
      group by p.id, p.slug, p.full_name, p.photo_url, pa.color_hex
      having count(*) >= ${minVerdicts}
      order by truth_score desc
      limit ${limit}
    `) as DbRankedPolitician[];
    return rows;
  } catch (e) {
    console.warn("getTopPoliticiansByScore failed:", (e as Error).message);
    return [];
  }
}

// --------- Function aggregate stats from DB ----------

export type DbFunctionStats = {
  function_slug: string;
  n_politicians: number;
  n_verdicts: number;
  truth_score: number;
};

/**
 * Compute per-function aggregate truth scores from published DB verifications.
 * Groups by `politicians.current_function_id → functions.slug`.
 * Falls back to [] on DB failure — caller uses fixture aggregate instead.
 */
export async function getFunctionDbStats(): Promise<DbFunctionStats[]> {
  try {
    const sql = getSql();
    const rows = (await sql`
      select
        fn.slug as function_slug,
        count(distinct p.id)::int as n_politicians,
        count(*)::int as n_verdicts,
        round(
          sum(
            v.confidence_score::float *
            case v.verdict
              when 'true'               then 100
              when 'mostly_true'        then 80
              when 'mixed'              then 50
              when 'misleading_context' then 35
              when 'mostly_false'       then 20
              when 'false'              then 0
              when 'unverifiable'       then 50
              else 50
            end
          ) / nullif(sum(v.confidence_score::float), 0)
        )::int as truth_score
      from verifications v
      join claims c on c.id = v.claim_id
      join politicians p on p.id = c.politician_id
      left join functions fn on fn.id = p.current_function_id
      where v.is_published
        and v.superseded_by_verification_id is null
        and c.deleted_at is null
        and fn.slug is not null
      group by fn.id, fn.slug
      having count(*) >= 1
      order by truth_score desc
    `) as DbFunctionStats[];
    return rows;
  } catch (e) {
    console.warn("getFunctionDbStats failed:", (e as Error).message);
    return [];
  }
}

// --------- Party aggregate stats from DB ----------

export type DbPartyStats = {
  party_slug: string;
  n_politicians: number;
  n_verdicts: number;
  truth_score: number;
};

/**
 * Compute per-party aggregate truth scores from published DB verifications.
 * Falls back to [] on DB failure — caller uses fixture aggregate instead.
 */
export async function getPartyDbStats(): Promise<DbPartyStats[]> {
  try {
    const sql = getSql();
    const rows = (await sql`
      select
        pa.slug as party_slug,
        count(distinct p.id)::int as n_politicians,
        count(*)::int as n_verdicts,
        round(
          sum(
            v.confidence_score::float *
            case v.verdict
              when 'true'               then 100
              when 'mostly_true'        then 80
              when 'mixed'              then 50
              when 'misleading_context' then 35
              when 'mostly_false'       then 20
              when 'false'              then 0
              when 'unverifiable'       then 50
              else 50
            end
          ) / nullif(sum(v.confidence_score::float), 0)
        )::int as truth_score
      from verifications v
      join claims c on c.id = v.claim_id
      join politicians p on p.id = c.politician_id
      left join parties pa on pa.id = p.current_party_id
      where v.is_published
        and v.superseded_by_verification_id is null
        and c.deleted_at is null
        and pa.slug is not null
      group by pa.id, pa.slug
      having count(*) >= 1
      order by truth_score desc
    `) as DbPartyStats[];
    return rows;
  } catch (e) {
    console.warn("getPartyDbStats failed:", (e as Error).message);
    return [];
  }
}
