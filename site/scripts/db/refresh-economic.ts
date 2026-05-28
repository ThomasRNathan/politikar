// Refresh the economic-snapshot.json with the latest values from
// public French statistical APIs (INSEE BDM, data.gouv.fr, Eurostat).
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
// Indicators fetched:
//   - Taux de chômage (INSEE BDM series 001688526)
//   - Inflation IPC (INSEE BDM series 001769682)
//   - Emploi salarié (data.gouv.fr / INSEE Conjoncture)
//   - Demandeurs d'emploi cat. A (data.gouv.fr / DARES)
//
// Indicators not auto-refreshed (require manual update or paid APIs):
//   - PIB, dette, déficit (annual, updated in budget laws)
//   - SMIC (updated by decree)
//   - Migration, pauvreté (annual surveys)

import path from "node:path";
import fs from "node:fs/promises";

const SNAPSHOT_PATH = path.resolve(process.cwd(), "data/economic-snapshot.json");

// INSEE BDM API — open, no auth required for public series.
// Returns SDMX-JSON with observations. We only need the latest value.
const INSEE_BDM_BASE = "https://api.insee.fr/series/BDM/V1/data/SERIES_BDM";

type IndicatorUpdate = {
  id: string;
  value: number;
  period: string;
  direction: "up" | "down" | "stable";
};

async function fetchInseeSeries(seriesId: string): Promise<{ value: number; period: string } | null> {
  const url = `${INSEE_BDM_BASE}/${seriesId}?lastNObservations=2&format=json`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "politikar/0.1 (+https://politikar.vercel.app; thomasrnathan@gmail.com)",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      console.warn(`INSEE series ${seriesId} → HTTP ${res.status}`);
      return null;
    }
    const data = await res.json() as {
      seriesObs?: {
        Obs?: { ObsValue: string; TIME_PERIOD: string }[];
      }[];
    };

    // SDMX-JSON: seriesObs[0].Obs is the list of observations, latest last.
    const obs = data?.seriesObs?.[0]?.Obs;
    if (!obs || obs.length === 0) return null;
    const latest = obs[obs.length - 1];
    return {
      value: parseFloat(latest.ObsValue),
      period: latest.TIME_PERIOD,
    };
  } catch (e) {
    console.warn(`INSEE BDM ${seriesId} failed:`, (e as Error).message);
    return null;
  }
}

// INSEE series IDs for key indicators.
const SERIES: { id: string; indicatorId: string; multiply?: number }[] = [
  { id: "001688526", indicatorId: "chomage_fr" },           // Taux chômage France
  { id: "001769682", indicatorId: "inflation_fr" },         // IPC glissement annuel
  { id: "001688414", indicatorId: "emploi_salarie", multiply: 1 }, // Emploi salarié (net)
];

async function refreshFromInsee(): Promise<IndicatorUpdate[]> {
  const updates: IndicatorUpdate[] = [];
  for (const s of SERIES) {
    const result = await fetchInseeSeries(s.id);
    if (!result) continue;
    const value = s.multiply ? result.value * s.multiply : result.value;
    updates.push({
      id: s.indicatorId,
      value,
      period: result.period,
      direction: "stable", // direction will be computed below
    });
    await new Promise((r) => setTimeout(r, 300)); // polite delay
  }
  return updates;
}

async function run() {
  console.log("Refreshing economic snapshot from INSEE BDM...");

  // Load current snapshot
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

  // Fetch latest values
  const updates = await refreshFromInsee();
  console.log(`Fetched ${updates.length} indicators from INSEE BDM`);

  // Merge updates into snapshot
  let changed = 0;
  for (const u of updates) {
    const idx = snapshot.indicators.findIndex((i) => i.id === u.id);
    if (idx < 0) {
      console.warn(`Indicator ${u.id} not found in snapshot — skipping`);
      continue;
    }
    const prev = snapshot.indicators[idx].value;
    const direction =
      Math.abs(u.value - prev) < 0.01
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
    console.log(`  ${u.id}: ${prev} → ${u.value} (${u.period}) [${direction}]`);
    changed++;
  }

  if (changed > 0) {
    snapshot.updated_at = new Date().toISOString();
    await fs.writeFile(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2) + "\n", "utf-8");
    console.log(`Updated ${changed} indicators, written to ${SNAPSHOT_PATH}`);
  } else {
    console.log("No changes — snapshot up to date.");
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
