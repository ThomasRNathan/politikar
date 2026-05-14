// Daily ingestion cron triggered by Vercel Cron.
//
// Schedule : configured in site/vercel.ts (04:00 UTC).
// Auth : Vercel injects `Authorization: Bearer ${CRON_SECRET}` on cron
//        invocations. We verify and refuse anything else.
// Persistence : if BLOB_READ_WRITE_TOKEN is provisioned (Vercel Blob
//        store linked to the project), the JSON snapshots are written to
//        Blob. Otherwise we return them in the response body for manual
//        inspection.
//
// To run manually:
//   curl -H "Authorization: Bearer $CRON_SECRET" https://politikar.vercel.app/api/cron/daily
import { NextResponse } from "next/server";
import { runIngestion, type IngestionSnapshot } from "@/lib/ingest/run";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // seconds (Fluid Compute default)

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // In local development, CRON_SECRET may be unset.
    return process.env.NODE_ENV !== "production";
  }
  const got = req.headers.get("authorization");
  return got === `Bearer ${secret}`;
}

async function persistToBlob(snapshot: IngestionSnapshot): Promise<
  { written: boolean; sourcesUrl?: string; factchecksUrl?: string; reason?: string }
> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return { written: false, reason: "BLOB_READ_WRITE_TOKEN not set" };
  }
  try {
    const { put } = await import("@vercel/blob");
    const sourcesPayload = {
      fetched_at: snapshot.fetched_at,
      pipeline_version: snapshot.pipeline_version,
      counts: {
        total: snapshot.sources.count,
        by_politician: snapshot.sources.by_politician,
      },
      sources: snapshot.sources.items,
      by_politician: Object.fromEntries(
        Object.keys(snapshot.sources.by_politician).map((pid) => [
          pid,
          snapshot.sources.items.filter((s) => s.politician_id === pid),
        ])
      ),
      errors: snapshot.errors,
    };
    const factchecksPayload = {
      fetched_at: snapshot.fetched_at,
      count: snapshot.factchecks.count,
      items: snapshot.factchecks.items,
    };
    const a = await put(
      "ingested-sources.json",
      JSON.stringify(sourcesPayload),
      {
        access: "public",
        contentType: "application/json",
        addRandomSuffix: false,
        allowOverwrite: true,
      }
    );
    const b = await put(
      "ingested-factchecks.json",
      JSON.stringify(factchecksPayload),
      {
        access: "public",
        contentType: "application/json",
        addRandomSuffix: false,
        allowOverwrite: true,
      }
    );
    return { written: true, sourcesUrl: a.url, factchecksUrl: b.url };
  } catch (e) {
    return { written: false, reason: (e as Error).message };
  }
}

function log(
  level: "info" | "warn" | "error",
  correlationId: string,
  event: string,
  data: Record<string, unknown> = {},
): void {
  // Structured JSON logs land in Vercel Functions logs and can be filtered
  // by correlation_id when investigating a specific cron invocation.
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    service: "politikar-cron-daily",
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
    req.headers.get("x-vercel-id") ??
    req.headers.get("x-request-id") ??
    crypto.randomUUID();

  if (!authorized(req)) {
    log("warn", correlationId, "cron.unauthorized", {
      ua: req.headers.get("user-agent"),
    });
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();
  log("info", correlationId, "cron.start");

  let snapshot;
  try {
    snapshot = await runIngestion();
  } catch (e) {
    log("error", correlationId, "cron.ingestion_failed", {
      message: (e as Error).message,
      stack: (e as Error).stack,
    });
    return NextResponse.json(
      { ok: false, error: "ingestion_failed", message: (e as Error).message },
      { status: 500 },
    );
  }

  log("info", correlationId, "cron.ingestion_done", {
    sources: snapshot.sources.count,
    factchecks: snapshot.factchecks.count,
    errors: snapshot.errors.length,
  });

  const persisted = await persistToBlob(snapshot);
  if (persisted.written) {
    log("info", correlationId, "cron.persisted", {
      sources_url: persisted.sourcesUrl,
      factchecks_url: persisted.factchecksUrl,
    });
  } else {
    log("warn", correlationId, "cron.persist_skipped", {
      reason: persisted.reason,
    });
  }

  const elapsedMs = Date.now() - startedAt;
  log("info", correlationId, "cron.done", { elapsed_ms: elapsedMs });

  return NextResponse.json({
    ok: true,
    correlation_id: correlationId,
    fetched_at: snapshot.fetched_at,
    pipeline_version: snapshot.pipeline_version,
    counts: {
      sources: snapshot.sources.count,
      factchecks: snapshot.factchecks.count,
    },
    persisted,
    errors: snapshot.errors,
    elapsed_ms: elapsedMs,
  });
}
