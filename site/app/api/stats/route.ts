// Public read-only stats endpoint. Returns aggregate counts from Neon
// plus the most recently published verdict. Used by the homepage
// StatusNotice and the /methode page to display live pipeline state.
//
// Cached at the edge for 5 minutes : matches the politician profile ISR
// cadence and keeps Neon load minimal even under heavy public traffic.

import { NextResponse } from "next/server";
import { getDbTotals } from "@/lib/db/reads";
import { getSql } from "@/lib/db/client";

export const runtime = "nodejs";
export const revalidate = 300;

type LatestVerdict = {
  claim_id: string;
  claim_text: string;
  verdict: string;
  confidence: number;
  politician: string;
  politician_slug: string;
  source_url: string | null;
  created_at: string;
} | null;

async function latestPublishedVerdict(): Promise<LatestVerdict> {
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
    `) as Array<{
      claim_id: string;
      claim_text: string;
      verdict: string;
      confidence: number;
      politician: string;
      politician_slug: string;
      source_url: string | null;
      created_at: string;
    }>;
    return rows[0] ?? null;
  } catch (e) {
    console.warn("latestPublishedVerdict failed:", (e as Error).message);
    return null;
  }
}

async function verdictDistribution(): Promise<Record<string, number>> {
  try {
    const sql = getSql();
    const rows = (await sql`
      select verdict, count(*)::int as n
      from verifications
      where is_published and superseded_by_verification_id is null
      group by verdict
    `) as { verdict: string; n: number }[];
    return Object.fromEntries(rows.map((r) => [r.verdict, r.n]));
  } catch (e) {
    console.warn("verdictDistribution failed:", (e as Error).message);
    return {};
  }
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
    const [totals, latest, distribution] = await Promise.all([
      getDbTotals(),
      latestPublishedVerdict(),
      verdictDistribution(),
    ]);
    log("info", correlationId, "stats.served", {
      elapsed_ms: Date.now() - startedAt,
      claims: totals.claims,
      sources: totals.sources,
      published: Object.values(distribution).reduce((a, b) => a + b, 0),
    });
    return NextResponse.json(
      {
        ok: true,
        counts: totals,
        verdicts: {
          published: Object.values(distribution).reduce((a, b) => a + b, 0),
          by_verdict: distribution,
        },
        latest_verdict: latest,
        computed_at: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control":
            "public, s-maxage=300, stale-while-revalidate=600",
        },
      },
    );
  } catch (e) {
    log("error", correlationId, "stats.failed", {
      message: (e as Error).message,
      stack: (e as Error).stack?.slice(0, 500),
    });
    return NextResponse.json(
      { ok: false, error: "internal_error", correlation_id: correlationId },
      { status: 500 },
    );
  }
}
