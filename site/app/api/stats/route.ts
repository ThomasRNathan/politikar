// Public read-only stats endpoint. Returns aggregate counts from Neon
// plus the most recently published verdict. Used by the homepage
// StatusNotice and the /methode page to display live pipeline state.
//
// Cached at the edge for 5 minutes : matches the politician profile ISR
// cadence and keeps Neon load minimal even under heavy public traffic.

import { NextResponse } from "next/server";
import {
  getDbTotals,
  getVerdictDistribution,
  getLatestPublishedVerdict,
} from "@/lib/db/reads";

export const runtime = "nodejs";
export const revalidate = 300;

function log(
  level: "info" | "warn" | "error",
  correlationId: string,
  event: string,
  data: Record<string, unknown> = {},
): void {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    service: "politikar-api-stats",
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
  const startedAt = Date.now();
  try {
    const [totals, distribution, latest] = await Promise.all([
      getDbTotals(),
      getVerdictDistribution(),
      getLatestPublishedVerdict(),
    ]);

    const byVerdict = Object.fromEntries(
      distribution.map((r) => [r.verdict, r.count]),
    );
    const totalPublished = distribution.reduce((s, r) => s + r.count, 0);

    log("info", correlationId, "stats.served", {
      elapsed_ms: Date.now() - startedAt,
      claims: totals.claims,
      published: totalPublished,
    });

    return NextResponse.json(
      {
        ok: true,
        counts: totals,
        verdicts: {
          published: totalPublished,
          by_verdict: byVerdict,
        },
        latest_verdict: latest,
        computed_at: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      },
    );
  } catch (e) {
    log("error", correlationId, "stats.failed", {
      message: (e as Error).message,
      stack: (e as Error).stack?.slice(0, 500),
    });
    return NextResponse.json(
      {
        ok: false,
        error: "internal_error",
        correlation_id: correlationId,
      },
      { status: 500 },
    );
  }
}
