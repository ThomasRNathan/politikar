// Daily full pipeline cron. Pulls fresh sources from all connectors
// (Élysée, Gouvernement.fr, NosDéputés), extracts claims via Mistral,
// embeds them via Voyage, runs the verification cascade with fact-checker
// similarity, and persists everything to Neon. Vercel calls this with
// `Authorization: Bearer ${CRON_SECRET}` per the schedule in vercel.ts.
//
// Manual trigger :
//   curl -H "Authorization: Bearer $CRON_SECRET" \
//        https://politikar.vercel.app/api/cron/extract?limit=10
//
// Default limit is 10 (round-robin across connectors: ~3-4 items per
// politician group) to fit in the 300 s Fluid Compute budget.

import { NextResponse } from "next/server";
import { runFullPipeline } from "@/lib/pipeline/run";
import { recomputeAllTruthScores } from "@/lib/db/scores";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authorized(req: Request): boolean {
  // Accept Vercel-injected Bearer CRON_SECRET, OR a query-param diag
  // token for manual debugging. In non-production NODE_ENV the route
  // is open for local dev.
  const cron = process.env.CRON_SECRET;
  const bearer = req.headers.get("authorization");
  if (cron && bearer === `Bearer ${cron}`) return true;
  const diag = new URL(req.url).searchParams.get("diag");
  const expectedDiag = process.env.DIAG_TOKEN;
  if (expectedDiag && diag === expectedDiag) return true;
  if (!cron && !expectedDiag) return process.env.NODE_ENV !== "production";
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
    service: "politikar-cron-extract",
    correlation_id: correlationId,
    event,
    ...data,
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export async function GET(req: Request) {
  const correlationId = req.headers.get("x-vercel-id") ?? crypto.randomUUID();

  if (!authorized(req)) {
    log("warn", correlationId, "cron.unauthorized");
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!process.env.MISTRAL_API_KEY) {
    log("error", correlationId, "missing_llm_key");
    return NextResponse.json(
      { ok: false, error: "missing_llm_key" },
      { status: 503 },
    );
  }
  if (!process.env.VOYAGE_API_KEY) {
    log("error", correlationId, "missing_embedding_key");
    return NextResponse.json(
      { ok: false, error: "missing_embedding_key" },
      { status: 503 },
    );
  }

  const url = new URL(req.url);
  const limit = Math.min(
    Math.max(parseInt(url.searchParams.get("limit") ?? "10", 10) || 10, 1),
    20,
  );
  const startedAt = Date.now();
  log("info", correlationId, "cron.start", { limit });

  const report = await runFullPipeline(limit);

  // Recompute real TruthScores from the (now updated) published verdicts.
  // Cheap relative to the pipeline; a failure here must not fail the cron.
  let scores: unknown = null;
  try {
    scores = await recomputeAllTruthScores();
    log("info", correlationId, "scores.recomputed", scores as Record<string, unknown>);
  } catch (e) {
    log("error", correlationId, "scores.failed", { message: (e as Error).message });
  }

  log("info", correlationId, "cron.done", {
    elapsed_ms: Date.now() - startedAt,
    candidates: report.candidates,
    inserted_sources: report.inserted_sources,
    inserted_claims: report.inserted_claims,
    verified_claims: report.verified_claims,
    published_verdicts: report.published_verdicts,
    politicians_covered: report.politicians_covered,
    errors: report.errors.length,
    tokens: report.tokens,
  });

  return NextResponse.json({
    ok: true,
    correlation_id: correlationId,
    elapsed_ms: Date.now() - startedAt,
    scores,
    ...report,
  });
}
