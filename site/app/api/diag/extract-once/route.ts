// One-shot diagnostic : pulls the latest Élysée item, runs the
// claim-extraction prompt against Mistral, optionally persists to Neon.
// Returns the structured extraction so we can verify the pipeline live
// without waiting for the daily cron schedule.
//
// Auth model : query-param shared secret. Pass ?diag=<value> where the
// value matches DIAG_TOKEN env var. If DIAG_TOKEN is unset, the endpoint
// is gated to non-production runs only.
//
// Structured JSON logs land in Vercel Functions logs and are filterable
// by correlation_id when investigating a specific invocation.

import { NextResponse } from "next/server";
import { fetchElysee, fetchArticleBody } from "@/lib/ingest/elysee";
import { extractClaims } from "@/lib/llm/extract";
import { upsertSource, insertClaims } from "@/lib/db/writes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authorized(req: Request): boolean {
  // Accept either ?diag=<DIAG_TOKEN> or Authorization: Bearer <CRON_SECRET>.
  const diag = new URL(req.url).searchParams.get("diag");
  const expectedDiag = process.env.DIAG_TOKEN;
  if (expectedDiag && diag === expectedDiag) return true;
  const cron = process.env.CRON_SECRET;
  const bearer = req.headers.get("authorization");
  if (cron && bearer === `Bearer ${cron}`) return true;
  if (!expectedDiag && !cron) return process.env.NODE_ENV !== "production";
  return false;
}

function log(
  level: "info" | "warn" | "error",
  correlationId: string,
  event: string,
  data: Record<string, unknown> = {},
): void {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    service: "politikar-diag-extract-once",
    correlation_id: correlationId,
    event,
    ...data,
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export async function GET(req: Request) {
  const correlationId =
    req.headers.get("x-vercel-id") ?? crypto.randomUUID();
  const url = new URL(req.url);
  const persist = url.searchParams.get("persist") === "1";
  const count = Math.min(
    Math.max(parseInt(url.searchParams.get("count") ?? "1", 10) || 1, 1),
    20,
  );

  if (!authorized(req)) {
    log("warn", correlationId, "diag.unauthorized");
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();
  log("info", correlationId, "diag.start", { persist, count });

  // Probe critical env state up front so the response is informative
  // even when an upstream service is misconfigured.
  const envProbe = {
    MISTRAL_API_KEY_len: process.env.MISTRAL_API_KEY?.length ?? 0,
    DATABASE_URL_set: !!process.env.DATABASE_URL,
  };

  let items;
  try {
    items = await fetchElysee();
  } catch (e) {
    log("error", correlationId, "ingest_failed", {
      message: (e as Error).message,
    });
    return NextResponse.json(
      {
        ok: false,
        stage: "ingest",
        error: (e as Error).message,
        env: envProbe,
      },
      { status: 502 },
    );
  }
  if (items.length === 0) {
    return NextResponse.json(
      { ok: false, stage: "ingest", error: "no Élysée items returned", env: envProbe },
      { status: 502 },
    );
  }

  // Pick `count` most-relevant items : prefer those with a non-trivial
  // summary, fall back to head order.
  const ranked = [...items].sort(
    (a, b) => (b.summary?.length ?? 0) - (a.summary?.length ?? 0),
  );
  const targets = ranked.slice(0, count);
  log("info", correlationId, "diag.targets_picked", { count: targets.length });

  const perTarget: Array<{
    url: string | null;
    title: string | null;
    occurred_at: string | null;
    n_claims: number;
    tokens_in?: number;
    tokens_out?: number;
    inserted_source: boolean;
    inserted_claims: number;
    skipped_claims: number;
    error?: string;
  }> = [];
  let totalClaims = 0;
  let totalInserted = 0;

  for (const target of targets) {
    // Try to enrich the source with the full article body. RSS summaries
    // are 100-200 chars whereas full bodies run 1-5 KB, giving the LLM
    // a much richer surface to extract claims from.
    let body: string | null = null;
    if (target.url) {
      body = await fetchArticleBody(target.url);
    }
    const rawText = body && body.length > 200
      ? `${target.title}\n\n${body}`
      : [target.title, target.summary].filter(Boolean).join("\n\n");
    if (!rawText.trim() || rawText.length < 30) continue;
    log("info", correlationId, "diag.target_text", {
      url: target.url,
      raw_text_len: rawText.length,
      used_full_body: body !== null && body.length > 200,
    });
    try {
      const extraction = await extractClaims({
        politicianFullName: "Emmanuel Macron",
        politicianFunction: "Président de la République",
        politicianParty: "Renaissance",
        occurredAt: target.occurred_at ?? "",
        channel: target.channel,
        sourceType: target.source_type,
        text: rawText,
      });
      totalClaims += extraction.output.claims.length;
      let insertedSource = false;
      let insertedClaims = 0;
      let skippedClaims = 0;
      if (persist) {
        const sourceRes = await upsertSource(target, rawText);
        insertedSource = sourceRes.inserted;
        const claimsRes = await insertClaims(
          sourceRes.source_id,
          target.politician_id,
          extraction.output.claims,
          {
            modelId: extraction.model_id,
            promptVersion: extraction.prompt_version,
          },
        );
        insertedClaims = claimsRes.inserted;
        skippedClaims = claimsRes.skipped_duplicate;
        totalInserted += claimsRes.inserted;
        log("info", correlationId, "diag.persisted_item", {
          url: target.url,
          inserted_source: insertedSource,
          inserted_claims: insertedClaims,
          skipped_claims: skippedClaims,
        });
      }
      perTarget.push({
        url: target.url,
        title: target.title,
        occurred_at: target.occurred_at,
        n_claims: extraction.output.claims.length,
        tokens_in: extraction.usage.input_tokens,
        tokens_out: extraction.usage.output_tokens,
        inserted_source: insertedSource,
        inserted_claims: insertedClaims,
        skipped_claims: skippedClaims,
      });
    } catch (e) {
      const msg = (e as Error).message;
      log("error", correlationId, "diag.item_failed", { url: target.url, message: msg });
      perTarget.push({
        url: target.url,
        title: target.title,
        occurred_at: target.occurred_at,
        n_claims: 0,
        inserted_source: false,
        inserted_claims: 0,
        skipped_claims: 0,
        error: msg,
      });
    }
  }

  log("info", correlationId, "diag.done", {
    elapsed_ms: Date.now() - startedAt,
    total_claims: totalClaims,
    total_inserted: totalInserted,
  });

  return NextResponse.json({
    ok: true,
    correlation_id: correlationId,
    elapsed_ms: Date.now() - startedAt,
    env: envProbe,
    count: targets.length,
    total_claims_extracted: totalClaims,
    total_claims_inserted: totalInserted,
    per_target: perTarget,
  });
}
