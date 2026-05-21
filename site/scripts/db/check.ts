// Quick smoke check: list public tables + key views + extensions.
import path from "node:path";
import { Client, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { config } from "dotenv";

config({ path: path.resolve(process.cwd(), ".env.local") });
neonConfig.webSocketConstructor = ws;

async function main() {
  const c = new Client({ connectionString: process.env.DATABASE_URL_UNPOOLED! });
  await c.connect();

  const ext = await c.query<{ extname: string; version: string }>(
    "select extname, extversion as version from pg_extension order by extname"
  );
  console.log("# extensions");
  for (const r of ext.rows) console.log(`  ${r.extname} ${r.version}`);

  const tables = await c.query<{ name: string }>(
    "select tablename as name from pg_tables where schemaname='public' order by tablename"
  );
  console.log("\n# tables (" + tables.rows.length + ")");
  for (const r of tables.rows) console.log(`  ${r.name}`);

  const views = await c.query<{ name: string }>(
    "select viewname as name from pg_views where schemaname='public' order by viewname"
  );
  console.log("\n# views (" + views.rows.length + ")");
  for (const r of views.rows) console.log(`  ${r.name}`);

  const matviews = await c.query<{ name: string }>(
    "select matviewname as name from pg_matviews where schemaname='public' order by matviewname"
  );
  console.log("\n# materialized views (" + matviews.rows.length + ")");
  for (const r of matviews.rows) console.log(`  ${r.name}`);

  await c.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
