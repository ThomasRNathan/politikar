// Daily LLM extraction cron triggered by Vercel Cron.
//
// Pipeline :
//   1. Fetch the latest Élysée RSS items (and other ingestion connectors
//      as they come online)
//   2. Upsert each as a `sources` row in Neon, dedup-ing on
//      raw_text_sha256
//   3. For each newly inserted source, call Mistral via AI SDK v6 to
//      extract claims
//   4. Insert claims into `claims`, dedup-ing on (politician, normalized)
//
// Verification cascade is a separate cron (TODO : /api/cron/verify).
//
// Auth : Vercel injects `Authorization: Bearer ${CRON_SECRET}` on cron
// runs. Manual invocation : same header.

import { NextResponse } from "next/server";
import { fetchElysee } from "@/lib/ingest/elysee";
import { extractClaims } from "@/lib/llm/extract";
import { upsertSource, insertClaims } from "@/lib/db/writes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  return req.headers.get("authorization") === `Bearer ${secret}`;
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
  const correlationId =
    req.headers.get("x-vercel-id") ?? crypto.randomUUID();

  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!process.env.MISTRAL_API_KEY) {
    return NextResponse.json(
      {
        ok: false,
        error: "missing_llm_key",
        hint: "Set MISTRAL_API_KEY in Vercel project env (Production+Preview+Development).",
      },
      { status: 503 },
    );
  }

  const limit = Number(
    new URL(req.url).searchParams.get("limit") ?? "5",
  );
  const startedAt = Date.now();
  log("info", correlationId, "extract.start", { limit });

  // Pull latest Élysée items
  let items: Awaited<ReturnType<typeof fetchElysee>>;
  try {
    items = await fetchElysee();
  } catch (e) {
    log("error", correlationId, "ingest_failed", {
      message: (e as Error).message,
    });
    return NextResponse.json(
      { ok: false, error: "ingest_failed", message: (e as Error).message },
      { status: 500 },
    );
  }
  const candidates = items.slice(0, limit);

  const report: Array<{
    source_url: string | null;
    politician: string;
    inserted_source: boolean;
    extracted_claims: number;
    inserted_claims: number;
    skipped_claims: number;
    error?: string;
  }> = [];

  let totalClaimsInserted = 0;
  let totalClaimsExtracted = 0;

  for (const item of candidates) {
    const rawText = [item.title, item.summary].filter(Boolean).join("\n\n");
    if (!rawText.trim() || rawText.length < 30) {
      continue;
    }
    try {
      const up = await upsertSource(item, rawText);
      if (!up.inserted) {
        report.push({
          source_url: item.url,
          politician: item.politician_id,
          inserted_source: false,
          extracted_claims: 0,
          inserted_claims: 0,
          skipped_claims: 0,
        });
        continue;
      }
      log("info", correlationId, "source_inserted", {
        source_id: up.source_id,
        url: item.url,
      });

      // Politician metadata for the extraction prompt
      // Hardcoded for Élysée → Macron ; future connectors enrich the
      // IngestedSource type to carry function/party at ingest time.
      const extr = await extractClaims({
        politicianFullName: "Emmanuel Macron",
        politicianFunction: "Président de la République",
        politicianParty: "Renaissance",
        occurredAt: item.occurred_at ?? "",
        channel: item.channel,
        sourceType: item.source_type,
        text: rawText,
      });
      totalClaimsExtracted += extr.output.claims.length;
      log("info", correlationId, "extraction_done", {
        source_id: up.source_id,
        n_claims: extr.output.claims.length,
        tokens_in: extr.usage.input_tokens,
        tokens_out: extr.usage.output_tokens,
      });

      const written = await insertClaims(
        up.source_id,
        item.politician_id,
        extr.output.claims,
        { modelId: extr.model_id, promptVersion: extr.prompt_version },
      );
      totalClaimsInserted += written.inserted;
      report.push({
        source_url: item.url,
        politician: item.politician_id,
        inserted_source: true,
        extracted_claims: extr.output.claims.length,
        inserted_claims: written.inserted,
        skipped_claims: written.skipped_duplicate,
      });
    } catch (e) {
      const msg = (e as Error).message;
      log("error", correlationId, "item_failed", { url: item.url, message: msg });
      report.push({
        source_url: item.url,
        politician: item.politician_id,
        inserted_source: false,
        extracted_claims: 0,
        inserted_claims: 0,
        skipped_claims: 0,
        error: msg,
      });
    }
  }

  const elapsedMs = Date.now() - startedAt;
  log("info", correlationId, "extract.done", {
    elapsed_ms: elapsedMs,
    candidates: candidates.length,
    total_extracted: totalClaimsExtracted,
    total_inserted: totalClaimsInserted,
  });

  return NextResponse.json({
    ok: true,
    correlation_id: correlationId,
    elapsed_ms: elapsedMs,
    candidates: candidates.length,
    total_claims_extracted: totalClaimsExtracted,
    total_claims_inserted: totalClaimsInserted,
    report,
  });
}
