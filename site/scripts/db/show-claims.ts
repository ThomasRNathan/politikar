// Print the latest sources + claims persisted in Neon, with the
// politician they're attributed to. Use to verify the extraction
// pipeline end-to-end.

import path from "node:path";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { config } from "dotenv";

config({ path: path.resolve(process.cwd(), ".env.local") });
neonConfig.webSocketConstructor = ws;

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL_UNPOOLED!,
  });
  const counts = await pool.query<{ sources: string; claims: string; politicians: string }>(
    `select
       (select count(*) from sources where deleted_at is null) as sources,
       (select count(*) from claims where deleted_at is null) as claims,
       (select count(*) from politicians where deleted_at is null) as politicians`,
  );
  const { sources, claims, politicians } = counts.rows[0];
  console.log(`# Neon state`);
  console.log(`  politicians : ${politicians}`);
  console.log(`  sources     : ${sources}`);
  console.log(`  claims      : ${claims}`);
  console.log("");

  console.log("# Latest 5 claims");
  const latest = await pool.query<{
    claim_text: string;
    claim_type: string;
    topic_tags: string[];
    extraction_confidence: string;
    llm_model: string;
    prompt_version: string;
    full_name: string;
    source_url: string;
    occurred_at: Date;
  }>(`
    select c.claim_text, c.claim_type, c.topic_tags,
           c.extraction_confidence, c.llm_model, c.prompt_version,
           p.full_name, s.url as source_url, s.occurred_at
    from claims c
    join politicians p on p.id = c.politician_id
    join sources s on s.id = c.source_id
    where c.deleted_at is null
    order by c.created_at desc
    limit 5
  `);
  if (latest.rows.length === 0) {
    console.log("  (none yet)");
  } else {
    for (const r of latest.rows) {
      console.log(`  • ${r.full_name} — ${r.claim_type} (conf ${r.extraction_confidence})`);
      console.log(`    « ${r.claim_text.slice(0, 140)}${r.claim_text.length > 140 ? "…" : ""} »`);
      console.log(`    tags: ${r.topic_tags.join(", ")}`);
      console.log(`    model: ${r.llm_model} | prompt: ${r.prompt_version}`);
      console.log(`    source: ${r.source_url ?? "—"}`);
      console.log("");
    }
  }
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
