// One-shot enrichment :
//   1. Embed every claim that has no embedding yet (Voyage)
//   2. Embed the local fact-check corpus
//   3. For each un-verified claim, find top-3 most similar fact-checks
//      and ask Mistral to produce a verdict
//   4. Insert verdicts into `verifications` table (published if confidence
//      is high enough and the politician isn't P0 sensitive — otherwise
//      it lands in claim_review_queue)
//
// Idempotent : skips claims already embedded / verified.

import path from "node:path";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { config } from "dotenv";

config({ path: path.resolve(process.cwd(), ".env.local") });
neonConfig.webSocketConstructor = ws;

import { embed, pgVectorLiteral } from "../../lib/llm/embed";
import { verifyClaim } from "../../lib/llm/verify";
import factchecksJson from "../../data/ingested-factchecks.json";

type Factcheck = { id: string; outlet: string; title: string; url: string };
const FACTCHECKS = (factchecksJson as { items: Factcheck[] }).items;

async function embedMissing(pool: Pool): Promise<number> {
  const { rows: missing } = await pool.query<{ id: string; claim_text: string }>(
    `select id::text, claim_text from claims
     where embedding is null and deleted_at is null
     order by created_at asc
     limit 200`,
  );
  if (missing.length === 0) {
    console.log("  no claims to embed");
    return 0;
  }
  console.log(`  embedding ${missing.length} claims via Voyage...`);
  const res = await embed(
    missing.map((r) => r.claim_text),
    { inputType: "document" },
  );
  for (let i = 0; i < missing.length; i++) {
    const vec = pgVectorLiteral(res.embeddings[i]);
    await pool.query(
      "update claims set embedding = $1::vector where id = $2",
      [vec, missing[i].id],
    );
  }
  console.log(`  embedded ${missing.length} claims, ${res.total_tokens} tokens`);
  return missing.length;
}

let fcEmbeddings: { fc: Factcheck; vec: number[] }[] | null = null;
async function getFactcheckEmbeddings() {
  if (fcEmbeddings) return fcEmbeddings;
  console.log(`  embedding ${FACTCHECKS.length} fact-check titles via Voyage...`);
  const titles = FACTCHECKS.map((f) => f.title);
  const res = await embed(titles, { inputType: "document" });
  fcEmbeddings = FACTCHECKS.map((fc, i) => ({ fc, vec: res.embeddings[i] }));
  console.log(`  done, ${res.total_tokens} tokens`);
  return fcEmbeddings;
}

function cosineSim(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

async function verifyMissing(pool: Pool): Promise<number> {
  const { rows: targets } = await pool.query<{
    id: string;
    claim_text: string;
    topic_tags: string[];
    embedding: string | null;
    politician_full: string;
    function_name: string;
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
    limit 30
  `);
  if (targets.length === 0) {
    console.log("  no claims to verify");
    return 0;
  }
  console.log(`  verifying ${targets.length} claims via Mistral cascade...`);

  const fcEmbs = await getFactcheckEmbeddings();
  let written = 0;

  for (const t of targets) {
    const claimVec = t.embedding
      ? (JSON.parse(t.embedding) as number[])
      : null;
    let hits: { outlet: string; title: string; url: string }[] = [];
    if (claimVec) {
      const ranked = fcEmbs
        .map((f) => ({ ...f, sim: cosineSim(claimVec, f.vec) }))
        .sort((a, b) => b.sim - a.sim)
        .slice(0, 3)
        .filter((x) => x.sim > 0.5);
      hits = ranked.map((r) => ({
        outlet: r.fc.outlet,
        title: r.fc.title,
        url: r.fc.url,
      }));
    }

    try {
      const res = await verifyClaim({
        claimText: t.claim_text,
        topicTags: t.topic_tags ?? [],
        politicianFullName: t.politician_full,
        politicianFunction: t.function_name ?? "—",
        occurredAt: t.occurred_at ?? "",
        channel: t.channel ?? "—",
        factCheckHits: hits,
      });

      // Conservative publication policy : auto-publish only when the
      // model is confident (>= 0.7) and the verdict isn't a hard-line
      // "false" on a P0 politician (those go to human review queue).
      const v = res.verdict;
      const sensitive =
        t.tier === "P0" && ["false", "mostly_false"].includes(v.verdict);
      const isPublished =
        v.confidence_score >= 0.7 &&
        !v.needs_human_review &&
        !sensitive;

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
           values ($1, $2)
           on conflict (claim_id) do nothing`,
          [t.id, v.needs_human_review ? "low_confidence" : sensitive ? "p0_politician" : "low_confidence"],
        );
      }
      written++;
      const flag = isPublished ? "✓ pub" : "⏳ queue";
      console.log(`  ${flag} ${v.verdict.padEnd(20)} conf ${v.confidence_score.toFixed(2)} | ${t.claim_text.slice(0, 80)}`);
    } catch (e) {
      console.error(`  ✗ ${t.id}: ${(e as Error).message}`);
    }
  }
  return written;
}

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL_UNPOOLED!,
  });
  try {
    console.log("# Step 1 — Voyage embeddings on claims");
    await embedMissing(pool);

    console.log("\n# Step 2 — Mistral verification cascade");
    const verified = await verifyMissing(pool);

    const counts = await pool.query(
      `select
         (select count(*) from claims where deleted_at is null)::int as claims,
         (select count(*) from claims where embedding is not null)::int as embedded,
         (select count(*) from verifications where superseded_by_verification_id is null)::int as verifications,
         (select count(*) from verifications where is_published)::int as published,
         (select count(*) from claim_review_queue where status='pending')::int as review_queue`,
    );
    console.log("\n# Final state :", counts.rows[0]);
    console.log(`# Verifications written this run : ${verified}`);
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
