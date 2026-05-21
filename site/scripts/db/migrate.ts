// Applies the SQL migrations in packages/db/migrations/ to the Neon
// database referenced by DATABASE_URL_UNPOOLED. Idempotent — already
// applied migrations are skipped via a schema_migrations table.

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { config } from "dotenv";
config({ path: path.resolve(process.cwd(), ".env.local") });

// Required for Neon's Client/Pool in Node.js (uses WebSockets for the
// pg wire protocol). Browser/Edge runtimes have WebSocket as a global.
neonConfig.webSocketConstructor = ws;

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.resolve(HERE, "..", "..", "..", "packages", "db", "migrations");

async function main() {
  const url = process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL_NON_POOLING;
  if (!url) {
    throw new Error("DATABASE_URL_UNPOOLED is not set. Run `vercel env pull .env.local`.");
  }
  const client = new Client({ connectionString: url });
  await client.connect();

  try {
    await client.query(`
      create table if not exists schema_migrations (
        filename text primary key,
        applied_at timestamptz not null default now(),
        sha text not null
      )
    `);

    const files = (await readdir(MIGRATIONS_DIR))
      .filter((f) => f.endsWith(".sql"))
      .sort();

    console.log(`# Migrations dir : ${MIGRATIONS_DIR}`);
    console.log(`# Files          : ${files.length}`);

    const { rows: alreadyApplied } = await client.query<{ filename: string }>(
      "select filename from schema_migrations"
    );
    const appliedSet = new Set(alreadyApplied.map((r) => r.filename));

    let appliedNow = 0;
    for (const file of files) {
      if (appliedSet.has(file)) {
        console.log(`  ✓ ${file} (already applied)`);
        continue;
      }
      const sql = await readFile(path.join(MIGRATIONS_DIR, file), "utf8");
      const sha = await sha256(sql);
      console.log(`  ⤴ applying ${file} (${sql.length} bytes, sha=${sha.slice(0, 8)}…)`);
      try {
        await client.query("begin");
        await client.query(sql);
        await client.query(
          "insert into schema_migrations (filename, sha) values ($1, $2)",
          [file, sha]
        );
        await client.query("commit");
        appliedNow++;
        console.log(`     ok`);
      } catch (e) {
        await client.query("rollback").catch(() => {});
        console.error(`     FAILED : ${(e as Error).message}`);
        throw e;
      }
    }

    console.log(`\n✓ ${appliedNow} migration(s) applied, ${files.length - appliedNow} already up to date.`);
  } finally {
    await client.end();
  }
}

async function sha256(s: string): Promise<string> {
  const buf = new TextEncoder().encode(s);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
