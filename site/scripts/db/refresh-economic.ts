// Refresh the economic-snapshot.json with the latest values from
// public French statistical APIs (INSEE BDM).
//
// Run manually:
//   npx tsx scripts/db/refresh-economic.ts
//
// Also available as /api/cron/economic-refresh for automatic weekly
// updates via Vercel Cron.
//
// The script writes to data/economic-snapshot.json in-place so the next
// build picks up the fresh values. During Vercel builds the stale
// snapshot is used; the update happens post-deploy via the cron.
//
// Indicators auto-refreshed:
//   - Taux de chômage       (INSEE BDM 001688527 — France hors Mayotte CVS)
//   - Taux de chômage jeunes(INSEE BDM 001688537 — moins de 25 ans, France hors Mayotte CVS)
//   - Inflation IPC YoY     (INSEE BDM 011814056 — IPC base 2025, YoY computed from 14 months)
//
// Indicators NOT auto-refreshed (no reliable open API series found):
//   - Emploi salarié net    — quarterly absolute variation, no stable IDBANK found
//   - Taux d'emploi 15-64   — no stable IDBANK found
//   - PIB, dette, déficit   — annual, updated in budget laws
//   - SMIC                  — updated by decree
//   - Migration, pauvreté   — annual surveys
//
// INSEE BDM API notes (updated 2026-05):
//   - The `format=json` query parameter is NO LONGER SUPPORTED. The API
//     returns SDMX-XML (StructureSpecificData) regardless of Accept header.
//   - Query: /data/SERIES_BDM/{idbank}?lastNObservations=N
//   - Response: <Obs TIME_PERIOD="..." OBS_VALUE="..."/> inside <Series>
//
// IPC base change (2026-02):
//   - INSEE rebased CPI from 2015 to 2025. Old base-2015 series (001769682)
//     is now stopped. Active series for CPI ensemble hors tabac is 011814056.
//   - No pre-computed YoY series was found; we compute it from 14 months
//     of the index (latest ÷ same month last year − 1) × 100.

import path from "node:path";
import fs from "node:fs/promises";

const SNAPSHOT_PATH = path.resolve(process.cwd(), "data/economic-snapshot.json");

// INSEE BDM SDMX 2.1 REST endpoint. No auth required for public series.
const INSEE_BDM_BASE = "https://api.insee.fr/series/BDM/V1/data/SERIES_BDM";

const UA = "politikar/0.1 (+https://politikar.vercel.app; thomasrnathan@gmail.com)";

// ─── SDMX-XML parser ────────────────────────────────────────────────────────

/**
 * Parse SDMX-XML (StructureSpecificData) returned by the INSEE BDM API.
 * Extracts all <Obs TIME_PERIOD="…" OBS_VALUE="…"/> elements from the
 * response and returns them sorted newest-first.
 */
function parseSdmxObs(xml: string): { value: number; period: string }[] {
  const obsRegex = /TIME_PERIOD="([^"]+)"[^/]*OBS_VALUE="([^"]+)"/g;
  const results: { value: number; period: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = obsRegex.exec(xml))) {
    const value = parseFloat(m[2]);
    if (!isNaN(value)) {
      results.push({ value, period: m[1] });
    }
  }
  // Sort newest first (ISO period strings sort lexicographically)
  results.sort((a, b) => b.period.localeCompare(a.period));
  return results;
}

// ─── Period formatter ────────────────────────────────────────────────────────

const FR_MONTHS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

/**
 * Convert an SDMX TIME_PERIOD string to a human-readable French label.
 *   "2026-Q1"  →  "T1 2026"
 *   "2026-04"  →  "avril 2026"
 *   "2026"     →  "2026"
 */
function formatPeriod(period: string): string {
  const quarterly = period.match(/^(\d{4})-Q(\d)$/);
  if (quarterly) return `T${quarterly[2]} ${quarterly[1]}`;

  const monthly = period.match(/^(\d{4})-(\d{2})$/);
  if (monthly) {
    const month = parseInt(monthly[2], 10);
    return `${FR_MONTHS[month - 1] ?? monthly[2]} ${monthly[1]}`;
  }

  return period; // annual or unknown — return as-is
}

// ─── Fetch helpers ───────────────────────────────────────────────────────────

async function fetchSdmx(seriesId: string, lastN: number): Promise<string | null> {
  const url = `${INSEE_BDM_BASE}/${seriesId}?lastNObservations=${lastN}`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      console.warn(`  INSEE ${seriesId} → HTTP ${res.status}`);
      return null;
    }
    return await res.text();
  } catch (e) {
    console.warn(`  INSEE ${seriesId} failed:`, (e as Error).message);
    return null;
  }
}

/**
 * Fetch the latest single observation from an INSEE BDM series.
 * Returns { value, period } for the most recent data point.
 */
async function fetchLatest(
  seriesId: string,
): Promise<{ value: number; period: string } | null> {
  const xml = await fetchSdmx(seriesId, 2);
  if (!xml) return null;
  const obs = parseSdmxObs(xml);
  if (obs.length === 0) {
    console.warn(`  INSEE ${seriesId} — no observations in response`);
    return null;
  }
  return obs[0]; // newest first after sort
}

/**
 * Fetch 14 months of an IPC index series and compute the year-on-year
 * change: (latest ÷ same month last year − 1) × 100.
 *
 * Returns { value: yoy_percent, period: latest_period } or null if the
 * two required observations are missing.
 */
async function fetchIpcYoY(
  seriesId: string,
): Promise<{ value: number; period: string } | null> {
  const xml = await fetchSdmx(seriesId, 14);
  if (!xml) return null;
  const obs = parseSdmxObs(xml); // sorted newest first
  if (obs.length < 13) {
    console.warn(`  INSEE ${seriesId} — fewer than 13 obs, cannot compute YoY`);
    return null;
  }
  const latest = obs[0];
  // Find the observation exactly 12 months before the latest.
  // Period format is "YYYY-MM"; subtract 12 months from the year part.
  const latestDate = latest.period; // e.g. "2026-04"
  const [latestYear, latestMM] = latestDate.split("-");
  const prevPeriod = `${parseInt(latestYear, 10) - 1}-${latestMM}`;
  const prevObs = obs.find((o) => o.period === prevPeriod);
  if (!prevObs) {
    console.warn(
      `  INSEE ${seriesId} — cannot find obs for ${prevPeriod} (needed for YoY vs ${latestDate})`,
    );
    return null;
  }
  const yoy = ((latest.value / prevObs.value) - 1) * 100;
  return { value: Math.round(yoy * 10) / 10, period: latest.period };
}

// ─── Series configuration ────────────────────────────────────────────────────

type SeriesSpec = {
  id: string;
  indicatorId: string;
  /** When true, compute year-on-year change from index level. */
  yoy?: boolean;
};

// INSEE BDM IDBANK codes verified 2026-06.
const SERIES: SeriesSpec[] = [
  // Taux de chômage (France hors Mayotte, BIT, CVS)
  // Q4 2024 = 7.3 % (matches snapshot); Q1 2026 = 8.1 %
  { id: "001688527", indicatorId: "chomage_fr" },

  // Taux de chômage des moins de 25 ans (France hors Mayotte, BIT, CVS)
  // Q4 2024 = 18.8 %; Q1 2026 = 21.1 %
  { id: "001688537", indicatorId: "chomage_jeunes" },

  // IPC base 2025 — Ensemble hors Tabac, France (mensuel).
  // INSEE rebased from 2015→2025 in Feb 2026; old series 001769682 is stopped.
  // No pre-computed glissement annuel series found; we compute YoY from 14 months.
  { id: "011814056", indicatorId: "inflation_fr", yoy: true },

  // ── Series not yet found ──────────────────────────────────────────────────
  // emploi_salarie  — quarterly net job creation (absolute number, ~27M level)
  //   The INSEE "Estimations trimestrielles d'emploi salarié" table at
  //   https://www.insee.fr/fr/statistiques/series/102759768 has the data but
  //   the IDBANK for the total-France CVS level series could not be confirmed
  //   via the API. Requires manual update for now.
  //
  // taux_emploi     — taux d'emploi 15-64 ans (France hors Mayotte, CVS)
  //   No confirmed IDBANK found in the 001688xxx range. Manual update.
];

// ─── Main update logic ───────────────────────────────────────────────────────

type IndicatorUpdate = {
  id: string;
  value: number;
  period: string;
};

async function refreshFromInsee(): Promise<IndicatorUpdate[]> {
  const updates: IndicatorUpdate[] = [];
  for (const s of SERIES) {
    const result = s.yoy
      ? await fetchIpcYoY(s.id)
      : await fetchLatest(s.id);

    if (!result) continue;

    updates.push({
      id: s.indicatorId,
      value: result.value,
      period: formatPeriod(result.period),
    });

    // Polite delay between requests
    await new Promise((r) => setTimeout(r, 400));
  }
  return updates;
}

async function run() {
  console.log("Refreshing economic snapshot from INSEE BDM...");

  const raw = await fs.readFile(SNAPSHOT_PATH, "utf-8");
  const snapshot = JSON.parse(raw) as {
    updated_at: string;
    indicators: Array<{
      id: string;
      value: number;
      period: string;
      direction: string;
      [key: string]: unknown;
    }>;
    [key: string]: unknown;
  };

  const updates = await refreshFromInsee();
  console.log(`Fetched ${updates.length} indicator(s) from INSEE BDM`);

  let changed = 0;
  for (const u of updates) {
    const idx = snapshot.indicators.findIndex((i) => i.id === u.id);
    if (idx < 0) {
      console.warn(`  Indicator ${u.id} not found in snapshot — skipping`);
      continue;
    }
    const prev = snapshot.indicators[idx].value;
    const prevPeriod = snapshot.indicators[idx].period;
    const direction: "up" | "down" | "stable" =
      Math.abs(u.value - prev) < 0.05
        ? "stable"
        : u.value > prev
          ? "up"
          : "down";
    snapshot.indicators[idx] = {
      ...snapshot.indicators[idx],
      value: u.value,
      period: u.period,
      direction,
    };
    console.log(
      `  ${u.id}: ${prev} → ${u.value} (${u.period}) [${direction}]`,
    );
    // Count as changed only if the value or period actually moved.
    if (u.value !== prev || u.period !== prevPeriod) changed++;
  }

  if (changed > 0) {
    snapshot.updated_at = new Date().toISOString();
    await fs.writeFile(
      SNAPSHOT_PATH,
      JSON.stringify(snapshot, null, 2) + "\n",
      "utf-8",
    );
    console.log(`✓ Updated ${changed} indicator(s) → ${SNAPSHOT_PATH}`);
  } else {
    console.log("No changes — snapshot already up to date.");
  }
}

async function main() {
  try {
    await run();
  } catch (e) {
    console.error("refresh-economic failed:", e);
    process.exit(1);
  }
}

main();
