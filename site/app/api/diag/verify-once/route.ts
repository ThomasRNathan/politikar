// Diagnostic verification cascade. Runs Voyage embeddings on un-embedded
// claims, then Mistral verification cascade on un-verified ones.
// Auth via ?diag=<DIAG_TOKEN>.

import { NextResponse } from "next/server";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { embed, pgVectorLiteral } from "@/lib/llm/embed";
import { verifyClaim } from "@/lib/llm/verify";
import factchecksJson from "@/data/ingested-factchecks.json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Node runtime needs the polyfill ; only set once.
if (
  typeof (globalThis as { WebSocket?: unknown }).WebSocket === "undefined"
) {
  neonConfig.webSocketConstructor = ws;
}

type Factcheck = { id: string; outlet: string; title: string; url: string };
const FACTCHECKS = (factchecksJson as { items: Factcheck[] }).items;

function authorized(req: Request): boolean {
  // Accept either ?diag=<DIAG_TOKEN> (query param) or
  // Authorization: Bearer <CRON_SECRET>. CRON_SECRET is auto-set by us
  // for the daily cron and reused here as a stable admin token.
  const diag = new URL(req.url).searchParams.get("diag");
  const expectedDiag = process.env.DIAG_TOKEN;
  if (expectedDiag && diag === expectedDiag) return true;
  const cron = process.env.CRON_SECRET;
  const bearer = req.headers.get("authorization");
  if (cron && bearer === `Bearer ${cron}`) return true;
  if (!expectedDiag && !cron) return process.env.NODE_ENV !== "production";
  return false;
}

function log(level: "info" | "warn" | "error", cid: string, event: string, data: Record<string, unknown> = {}) {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    service: "politikar-diag-verify",
    correlation_id: cid,
    event,
    ...data,
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
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

export async function GET(req: Request) {
  const cid = req.headers.get("x-vercel-id") ?? crypto.randomUUID();
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const limit = Math.min(
    Math.max(parseInt(url.searchParams.get("limit") ?? "10", 10) || 10, 1),
    30,
  );

  const startedAt = Date.now();
  const pool = new Pool({ connectionString: process.env.DATABASE_URL_UNPOOLED! });

  try {
    // 1) Embed any claim that lacks an embedding
    const { rows: missing } = await pool.query<{ id: string; claim_text: string }>(
      `select id::text, claim_text from claims
       where embedding is null and deleted_at is null
       order by created_at asc
       limit 200`,
    );
    let embedded = 0;
    let embedTokens = 0;
    if (missing.length > 0) {
      const er = await embed(
        missing.map((r) => r.claim_text),
        { inputType: "document" },
      );
      embedTokens = er.total_tokens;
      for (let i = 0; i < missing.length; i++) {
        await pool.query(
          "update claims set embedding = $1::vector where id = $2",
          [pgVectorLiteral(er.embeddings[i]), missing[i].id],
        );
        embedded++;
      }
      log("info", cid, "claims_embedded", { n: embedded, tokens: embedTokens });
    }

    // 2) Embed the fact-check corpus titles once per run
    const fcEmb = await embed(
      FACTCHECKS.map((f) => f.title),
      { inputType: "document" },
    );
    const fcEmbeddings = FACTCHECKS.map((fc, i) => ({ fc, vec: fcEmb.embeddings[i] }));
    log("info", cid, "factchecks_embedded", { n: FACTCHECKS.length, tokens: fcEmb.total_tokens });

    // 3) Pick claims with no active verification and verify them
    const { rows: targets } = await pool.query<{
      id: string;
      claim_text: string;
      topic_tags: string[];
      embedding: string | null;
      politician_full: string;
      function_name: string | null;
      occurred_at: string | null;
      channel: string | null;
      tier: string;
    }>(`
      select c.id::text, c.claim_text, c.topic_tags,
             c.embedding::text as embedding,
             p.full_name as politician_full, p.tier,
             f.name as function_name,
             s.occurred_at, s.channel
      from claims c
      join politicians p on p.id = c.politician_id
      left join functions f on f.id = p.current_function_id
      left join sources s on s.id = c.source_id
      where c.claim_type = 'factual_assertion'
        and c.deleted_at is null
        and not exists (
          select 1 from verifications v
          where v.claim_id = c.id
            and v.superseded_by_verification_id is null
        )
      order by s.occurred_at desc nulls last
      limit ${limit}
    `);

    type Per = {
      claim_id: string;
      claim_preview: string;
      verdict?: string;
      confidence?: number;
      is_published?: boolean;
      n_hits?: number;
      error?: string;
    };
    const per: Per[] = [];
    let written = 0;
    let totalTokensIn = 0;
    let totalTokensOut = 0;

    for (const t of targets) {
      try {
        const cv = t.embedding ? (JSON.parse(t.embedding) as number[]) : null;
        const hits = cv
          ? fcEmbeddings
              .map((f) => ({ ...f, sim: cosineSim(cv, f.vec) }))
              .sort((a, b) => b.sim - a.sim)
              .slice(0, 3)
              .filter((x) => x.sim > 0.5)
              .map((r) => ({ outlet: r.fc.outlet, title: r.fc.title, url: r.fc.url }))
          : [];

        const res = await verifyClaim({
          claimText: t.claim_text,
          topicTags: t.topic_tags ?? [],
          politicianFullName: t.politician_full,
          politicianFunction: t.function_name ?? "—",
          occurredAt: t.occurred_at ?? "",
          channel: t.channel ?? "—",
          factCheckHits: hits,
        });
        totalTokensIn += res.usage.input_tokens ?? 0;
        totalTokensOut += res.usage.output_tokens ?? 0;

        const v = res.verdict;
        const sensitive =
          t.tier === "P0" && ["false", "mostly_false"].includes(v.verdict);
        const isPublished =
          v.confidence_score >= 0.7 && !v.needs_human_review && !sensitive;

        await pool.query(
          `insert into verifications (
             claim_id, verdict, confidence_score, reasoning, evidence,
             data_sources_used, llm_model, prompt_version,
             human_reviewed, is_published
           ) values ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, false, $9)`,
          [
            t.id,
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
              t.id,
              v.needs_human_review
                ? "low_confidence"
                : sensitive
                  ? "p0_politician"
                  : "low_confidence",
            ],
          );
        }
        written++;
        per.push({
          claim_id: t.id,
          claim_preview: t.claim_text.slice(0, 80),
          verdict: v.verdict,
          confidence: v.confidence_score,
          is_published: isPublished,
          n_hits: hits.length,
        });
      } catch (e) {
        per.push({
          claim_id: t.id,
          claim_preview: t.claim_text.slice(0, 80),
          error: (e as Error).message.slice(0, 200),
        });
      }
    }

    const totals = await pool.query<{
      claims: number;
      embedded: number;
      verifications: number;
      published: number;
      review_queue: number;
    }>(`
      select
        (select count(*) from claims where deleted_at is null)::int as claims,
        (select count(*) from claims where embedding is not null)::int as embedded,
        (select count(*) from verifications where superseded_by_verification_id is null)::int as verifications,
        (select count(*) from verifications where is_published)::int as published,
        (select count(*) from claim_review_queue where status='pending')::int as review_queue
    `);

    log("info", cid, "verify.done", {
      embedded,
      verified: written,
      total_tokens_in: totalTokensIn,
      total_tokens_out: totalTokensOut,
      elapsed_ms: Date.now() - startedAt,
    });

    return NextResponse.json({
      ok: true,
      correlation_id: cid,
      elapsed_ms: Date.now() - startedAt,
      embedded_claims_now: embedded,
      verified_now: written,
      tokens: {
        embed: embedTokens + fcEmb.total_tokens,
        mistral_in: totalTokensIn,
        mistral_out: totalTokensOut,
      },
      totals: totals.rows[0],
      per_claim: per,
    });
  } finally {
    await pool.end();
  }
}
