// Orchestrator. Runs all connectors and writes JSON outputs to
// site/data/. Called via `npm run ingest` or before deploy.

import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { fetchElysee } from "./elysee.mjs";
import { fetchNosDeputesInterventions, NOSDEP_SLUGS } from "./nosdeputes.mjs";
import { fetchFactchecks } from "./factcheckers.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(HERE, "..", "..", "data");

async function main() {
  await mkdir(DATA_DIR, { recursive: true });

  const fetchedAt = new Date().toISOString();
  const sources = [];
  const errors = [];

  console.log("# Élysée");
  try {
    const items = await fetchElysee();
    console.log(`  ${items.length} items for Macron`);
    sources.push(...items);
  } catch (e) {
    console.error("  failed:", e.message);
    errors.push({ source: "elysee", message: e.message });
  }

  console.log("# NosDéputés interventions");
  for (const polId of Object.keys(NOSDEP_SLUGS)) {
    try {
      const items = await fetchNosDeputesInterventions({
        politicianId: polId,
        limit: 8,
      });
      console.log(`  ${polId}: ${items.length} interventions`);
      sources.push(...items);
    } catch (e) {
      console.error(`  ${polId} failed:`, e.message);
      errors.push({ source: `nosdeputes:${polId}`, message: e.message });
    }
  }

  console.log("# Fact-checkers");
  let factchecks = [];
  try {
    factchecks = await fetchFactchecks({ limitPerOutlet: 25 });
    console.log(`  ${factchecks.length} recent fact-check articles`);
  } catch (e) {
    console.error("  failed:", e.message);
    errors.push({ source: "factcheckers", message: e.message });
  }

  // Group sources by politician for the site
  const byPolitician = {};
  for (const s of sources) {
    (byPolitician[s.politician_id] ??= []).push(s);
  }

  const outSources = {
    fetched_at: fetchedAt,
    pipeline_version: "ingest-v0.1",
    counts: {
      total: sources.length,
      by_politician: Object.fromEntries(
        Object.entries(byPolitician).map(([k, v]) => [k, v.length])
      ),
    },
    sources,
    by_politician: byPolitician,
    errors,
  };

  const outFactchecks = {
    fetched_at: fetchedAt,
    count: factchecks.length,
    items: factchecks,
    errors: errors.filter((e) => e.source.startsWith("factcheckers")),
  };

  await writeFile(
    path.join(DATA_DIR, "ingested-sources.json"),
    JSON.stringify(outSources, null, 2)
  );
  await writeFile(
    path.join(DATA_DIR, "ingested-factchecks.json"),
    JSON.stringify(outFactchecks, null, 2)
  );

  console.log(
    `\n✓ Wrote ${sources.length} sources + ${factchecks.length} fact-checks → site/data/`
  );
  if (errors.length > 0) {
    console.log(`⚠ ${errors.length} errors. See output JSON.`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
