// Local ingestion script. Writes the snapshot to site/data/*.json so the
// site can bundle a fresh fallback at build time when Vercel Blob is not
// yet configured.
//
// Run with : npm run ingest

import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runIngestion } from "../../lib/ingest/run";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(HERE, "..", "..", "data");

async function main() {
  await mkdir(DATA_DIR, { recursive: true });
  console.log("# Running ingestion...");
  const s = await runIngestion();

  const sourcesPayload = {
    fetched_at: s.fetched_at,
    pipeline_version: s.pipeline_version,
    counts: {
      total: s.sources.count,
      by_politician: s.sources.by_politician,
    },
    sources: s.sources.items,
    by_politician: Object.fromEntries(
      Object.keys(s.sources.by_politician).map((pid) => [
        pid,
        s.sources.items.filter((x) => x.politician_id === pid),
      ])
    ),
    errors: s.errors,
  };
  const factchecksPayload = {
    fetched_at: s.fetched_at,
    count: s.factchecks.count,
    items: s.factchecks.items,
  };

  await writeFile(
    path.join(DATA_DIR, "ingested-sources.json"),
    JSON.stringify(sourcesPayload, null, 2),
  );
  await writeFile(
    path.join(DATA_DIR, "ingested-factchecks.json"),
    JSON.stringify(factchecksPayload, null, 2),
  );

  console.log(`✓ ${s.sources.count} sources + ${s.factchecks.count} factchecks → site/data/`);
  if (s.errors.length) {
    console.log(`⚠ ${s.errors.length} errors:`);
    for (const e of s.errors) console.log(`  - ${e.source}: ${e.message}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
