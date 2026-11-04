// Recomputes every politician's real TruthScore from published verdicts
// and persists it into politician_truth_scores (replacing the illustrative
// seed). Scheduled daily after the extraction cron; also callable manually.
//
//   curl -H "Authorization: Bearer $CRON_SECRET" \
//        https://politikar.com/api/cron/score

import { NextResponse } from "next/server";
import { recomputeAllTruthScores } from "@/lib/db/scores";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authorized(req: Request): boolean {
  const cron = process.env.CRON_SECRET;
  const bearer = req.headers.get("authorization");
  if (cron && bearer === `Bearer ${cron}`) return true;
  const diag = new URL(req.url).searchParams.get("diag");
  const expected = process.env.DIAG_TOKEN;
  if (expected && diag === expected) return true;
  if (!cron && !expected) return process.env.NODE_ENV !== "production";
  return false;
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const startedAt = Date.now();
  try {
    const report = await recomputeAllTruthScores();
    return NextResponse.json({
      ok: true,
      scoring_version: "v1.0.0",
      elapsed_ms: Date.now() - startedAt,
      ...report,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 },
    );
  }
}
