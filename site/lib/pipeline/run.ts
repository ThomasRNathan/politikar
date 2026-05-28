// Shared pipeline orchestration : reused by /api/cron/extract and the
// /api/diag/* manual triggers. Keeps one canonical end-to-end flow.
//
// Steps :
//   1. Pull Élysée RSS items
//   2. For each item :
//      - fetch article body (replaces RSS summary when available)
//      - upsert into sources (dedup sha256)
//      - extract claims via Mistral
//      - insert claims (dedup by politician + normalized text)
//      - for each newly inserted claim : embed (Voyage) + verify (Mistral)
//        with fact-checker similarity, publish or queue per policy.

import { fetchElysee, fetchArticleBody, type IngestedSource } from "@/lib/ingest/elysee";
import { extractClaims } from "@/lib/llm/extract";
import { verifyClaim } from "@/lib/llm/verify";
import { embed, pgVectorLiteral } from "@/lib/llm/embed";
import { upsertSource, insertClaims } from "@/lib/db/writes";
import { getPool } from "@/lib/db/client";
import factchecksJson from "@/data/ingested-factchecks.json";

type Factcheck = {
  id: string;
  outlet: string;
  title: string;
  url: string;
  body?: string | null;
};

const FACTCHECKS = (factchecksJson as { items: Factcheck[] }).items;

type FcVec = { fc: Factcheck; vec: number[] };
let factcheckCache: FcVec[] | null = null;

async function getFactcheckEmbeddings(): Promise<FcVec[]> {
  if (factcheckCache) return factcheckCache;
  const inputs = FACTCHECKS.map((f) =>
    f.body ? `${f.title}\n\n${f.body.slice(0, 400)}` : f.title,
  );
  const r = await embed(inputs, { inputType: "document" });
  factcheckCache = FACTCHECKS.map((fc, i) => ({ fc, vec: r.embeddings[i] }));
  return factcheckCache;
}

function cosineSim(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

export type ClaimRow = {
  id: string;
  claim_text: string;
  topic_tags: string[];
  embedding: string | null;
  politician_full: string;
  function_name: string | null;
  occurred_at: string | null;
  channel: string | null;
  tier: string;
};

export type VerifyOutcome = {
  claim_id: string;
  verdict: string;
  confidence: number;
  is_published: boolean;
  n_hits: number;
  tokens_in?: number;
  tokens_out?: number;
};

/**
 * Embed + verify one claim, persist the verification row, route to
 * publish or claim_review_queue per policy. Returns null if the claim
 * is missing prerequisites (e.g., no Mistral key configured).
 */
export async function verifyOneClaim(
  claimId: string,
  fcEmbeddings: FcVec[],
): Promise<VerifyOutcome | null> {
  const pool = getPool();
  const { rows } = await pool.query<ClaimRow>(
    `
    select c.id::text, c.claim_text, c.topic_tags,
           c.embedding::text as embedding,
           p.full_name as politician_full, p.tier,
           f.name as function_name,
           s.occurred_at, s.channel
    from claims c
    join politicians p on p.id = c.politician_id
    left join functions f on f.id = p.current_function_id
    left join sources s on s.id = c.source_id
    where c.id = $1 limit 1
    `,
    [claimId],
  );
  if (rows.length === 0) return null;
  const c = rows[0];

  // 1) Embed if needed
  let cv: number[] | null = c.embedding ? (JSON.parse(c.embedding) as number[]) : null;
  if (!cv) {
    const r = await embed([c.claim_text], { inputType: "document" });
    cv = r.embeddings[0];
    await pool.query(
      "update claims set embedding = $1::vector where id = $2",
      [pgVectorLiteral(cv), claimId],
    );
  }

  // 2) Fact-check similarity
  const hits = fcEmbeddings
    .map((f) => ({ ...f, sim: cosineSim(cv!, f.vec) }))
    .sort((a, b) => b.sim - a.sim)
    .slice(0, 3)
    .filter((x) => x.sim > 0.5)
    .map((r) => ({
      outlet: r.fc.outlet,
      title: r.fc.title,
      url: r.fc.url,
      body: r.fc.body ?? null,
      sim: r.sim,
    }));

  // 3) Mistral verification
  const res = await verifyClaim({
    claimText: c.claim_text,
    topicTags: c.topic_tags ?? [],
    politicianFullName: c.politician_full,
    politicianFunction: c.function_name ?? "—",
    occurredAt: c.occurred_at ?? "",
    channel: c.channel ?? "—",
    factCheckHits: hits,
  });

  const v = res.verdict;
  const sensitive =
    c.tier === "P0" && ["false", "mostly_false"].includes(v.verdict);
  const isPublished =
    v.confidence_score >= 0.7 && !v.needs_human_review && !sensitive;

  await pool.query(
    `insert into verifications (
       claim_id, verdict, confidence_score, reasoning, evidence,
       data_sources_used, llm_model, prompt_version,
       human_reviewed, is_published
     ) values ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, false, $9)`,
    [
      claimId,
      v.verdict,
      v.confidence_score,
      v.reasoning,
      JSON.stringify(v.evidence ?? []),
      v.data_sources_used ?? [],
      res.model_id,
      res.prompt_version,
      isPublished,
    ],
  );

  if (!isPublished) {
    await pool.query(
      `insert into claim_review_queue (claim_id, queued_for_reason)
       values ($1, $2) on conflict (claim_id) do nothing`,
      [
        claimId,
        v.needs_human_review
          ? "low_confidence"
          : sensitive
            ? "p0_politician"
            : "low_confidence",
      ],
    );
  }

  return {
    claim_id: claimId,
    verdict: v.verdict,
    confidence: v.confidence_score,
    is_published: isPublished,
    n_hits: hits.length,
    tokens_in: res.usage.input_tokens,
    tokens_out: res.usage.output_tokens,
  };
}

export type FullPipelineReport = {
  candidates: number;
  inserted_sources: number;
  extracted_claims: number;
  inserted_claims: number;
  verified_claims: number;
  published_verdicts: number;
  errors: { stage: string; url?: string; message: string }[];
  tokens: {
    extract_in: number;
    extract_out: number;
    embed: number;
    verify_in: number;
    verify_out: number;
  };
  per_item: Array<{
    url: string | null;
    title: string | null;
    inserted_source: boolean;
    n_claims: number;
    n_inserted: number;
    verdicts: { id: string; verdict: string; published: boolean }[];
  }>;
};

/**
 * Run the full daily pipeline. `limit` caps how many freshest Élysée
 * items are processed in this invocation (rate-limit / time budget).
 */
export async function runFullPipeline(
  limit: number = 5,
): Promise<FullPipelineReport> {
  const report: FullPipelineReport = {
    candidates: 0,
    inserted_sources: 0,
    extracted_claims: 0,
    inserted_claims: 0,
    verified_claims: 0,
    published_verdicts: 0,
    errors: [],
    tokens: {
      extract_in: 0,
      extract_out: 0,
      embed: 0,
      verify_in: 0,
      verify_out: 0,
    },
    per_item: [],
  };

  let items: IngestedSource[];
  try {
    items = await fetchElysee();
  } catch (e) {
    report.errors.push({ stage: "ingest", message: (e as Error).message });
    return report;
  }

  // Prefer items with the longest summaries — proxy for substantive content.
  const ranked = [...items].sort(
    (a, b) => (b.summary?.length ?? 0) - (a.summary?.length ?? 0),
  );
  const targets = ranked.slice(0, limit);
  report.candidates = targets.length;

  // Embed fact-check corpus once
  let fcEmbeddings: FcVec[];
  try {
    fcEmbeddings = await getFactcheckEmbeddings();
  } catch (e) {
    report.errors.push({ stage: "fc_embed", message: (e as Error).message });
    return report;
  }

  for (const target of targets) {
    const itemReport: FullPipelineReport["per_item"][number] = {
      url: target.url,
      title: target.title,
      inserted_source: false,
      n_claims: 0,
      n_inserted: 0,
      verdicts: [],
    };
    try {
      let body: string | null = null;
      if (target.url) body = await fetchArticleBody(target.url);
      const rawText =
        body && body.length > 200
          ? `${target.title}\n\n${body}`
          : [target.title, target.summary].filter(Boolean).join("\n\n");
      if (!rawText.trim() || rawText.length < 30) {
        report.per_item.push(itemReport);
        continue;
      }

      const up = await upsertSource(target, rawText);
      itemReport.inserted_source = up.inserted;
      if (up.inserted) report.inserted_sources++;

      if (!up.inserted) {
        report.per_item.push(itemReport);
        continue; // dedup → no need to re-extract this content
      }

      const extr = await extractClaims({
        politicianFullName: "Emmanuel Macron",
        politicianFunction: "Président de la République",
        politicianParty: "Renaissance",
        occurredAt: target.occurred_at ?? "",
        channel: target.channel,
        sourceType: target.source_type,
        text: rawText,
      });
      report.tokens.extract_in += extr.usage.input_tokens ?? 0;
      report.tokens.extract_out += extr.usage.output_tokens ?? 0;
      report.extracted_claims += extr.output.claims.length;
      itemReport.n_claims = extr.output.claims.length;

      const written = await insertClaims(
        up.source_id,
        target.politician_id,
        extr.output.claims,
        { modelId: extr.model_id, promptVersion: extr.prompt_version },
      );
      report.inserted_claims += written.inserted;
      itemReport.n_inserted = written.inserted;

      // Fetch the IDs of the just-inserted claims so we can verify them
      const pool = getPool();
      const { rows: newClaimIds } = await pool.query<{ id: string }>(
        `select id::text from claims
         where source_id = $1 and deleted_at is null
         order by created_at desc
         limit $2`,
        [up.source_id, written.inserted],
      );

      for (const cr of newClaimIds) {
        try {
          const v = await verifyOneClaim(cr.id, fcEmbeddings);
          if (v) {
            report.verified_claims++;
            if (v.is_published) report.published_verdicts++;
            report.tokens.verify_in += v.tokens_in ?? 0;
            report.tokens.verify_out += v.tokens_out ?? 0;
            itemReport.verdicts.push({
              id: v.claim_id,
              verdict: v.verdict,
              published: v.is_published,
            });
          }
        } catch (e) {
          report.errors.push({
            stage: "verify",
            url: target.url ?? undefined,
            message: (e as Error).message,
          });
        }
      }
    } catch (e) {
      report.errors.push({
        stage: "item",
        url: target.url ?? undefined,
        message: (e as Error).message,
      });
    }
    report.per_item.push(itemReport);
  }

  return report;
}
