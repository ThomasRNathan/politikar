// Weekly cron that fetches the latest French macroeconomic indicators from
// INSEE BDM and updates the in-memory snapshot used by the verification
// cascade. Because the snapshot is imported at build-time, this endpoint
// does NOT write to the file system on Vercel (read-only after build).
//
// Instead it returns the latest values as JSON so the caller (or a GitHub
// Action) can commit an update to data/economic-snapshot.json and trigger
// a fresh deployment.
//
// For now the endpoint serves as a diagnostic / manual-trigger tool:
//   curl -H "Authorization: Bearer $CRON_SECRET" \
//        https://politikar.vercel.app/api/cron/refresh-economic
//
// The INSEE BDM REST API is free and public — no auth required.

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(req: Request): boolean {
  const cron = process.env.CRON_SECRET;
  const bearer = req.headers.get("authorization");
  if (cron && bearer === `Bearer ${cron}`) return true;
  const diag = new URL(req.url).searchParams.get("diag");
  const expectedDiag = process.env.DIAG_TOKEN;
  if (expectedDiag && diag === expectedDiag) return true;
  if (!cron && !expectedDiag) return process.env.NODE_ENV !== "production";
  return false;
}

const INSEE_BDM_BASE = "https://api.insee.fr/series/BDM/V1/data/SERIES_BDM";

type SeriesSpec = {
  indicatorId: string;
  label: string;
  seriesId: string;
  unit: string;
};

const SERIES: SeriesSpec[] = [
  { indicatorId: "chomage_fr",    label: "Taux de chômage",   seriesId: "001688526", unit: "%" },
  { indicatorId: "inflation_fr",  label: "Inflation (IPC)",   seriesId: "001769682", unit: "%" },
];

async function fetchSeries(spec: SeriesSpec): Promise<{ value: number; period: string } | null> {
  const url = `${INSEE_BDM_BASE}/${spec.seriesId}?lastNObservations=1&format=json`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "politikar/0.1 (+https://politikar.vercel.app; thomasrnathan@gmail.com)",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json() as {
      seriesObs?: { Obs?: { ObsValue: string; TIME_PERIOD: string }[] }[];
    };
    const obs = data?.seriesObs?.[0]?.Obs;
    if (!obs || obs.length === 0) return null;
    const latest = obs[obs.length - 1];
    return {
      value: parseFloat(latest.ObsValue),
      period: latest.TIME_PERIOD,
    };
  } catch {
    return null;
  }
}

function log(
  level: "info" | "warn" | "error",
  event: string,
  data: Record<string, unknown> = {},
): void {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    service: "politikar-cron-refresh-economic",
    event,
    ...data,
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    log("warn", "cron.unauthorized");
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();
  log("info", "cron.start", { series_count: SERIES.length });

  // Fetch all series concurrently — INSEE BDM handles parallel requests fine.
  const settled = await Promise.allSettled(
    SERIES.map((spec) => fetchSeries(spec).then((r) => ({ spec, r }))),
  );

  const results: Record<string, { value: number; period: string; unit: string } | null> = {};
  const errors: string[] = [];

  for (const s of settled) {
    if (s.status === "fulfilled") {
      const { spec, r } = s.value;
      results[spec.indicatorId] = r ? { ...r, unit: spec.unit } : null;
      if (!r) errors.push(spec.indicatorId);
    } else {
      errors.push("unknown");
    }
  }

  log("info", "cron.done", {
    elapsed_ms: Date.now() - startedAt,
    fetched: Object.keys(results).length,
    errors: errors.length,
  });

  return NextResponse.json({
    ok: true,
    fetched_at: new Date().toISOString(),
    elapsed_ms: Date.now() - startedAt,
    results,
    errors,
    note: "Vercel read-only FS: commit economic-snapshot.json update manually or via CI to persist these values.",
  });
}
