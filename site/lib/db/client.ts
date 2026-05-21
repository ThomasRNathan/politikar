// Lazy Neon DB client used in Route Handlers and scripts. Server-only.
//
// We expose two flavors :
//   - `getSql()` returns a tagged-template `neon()` driver for cheap
//     stateless one-shots over HTTP. Best for short reads.
//   - `getPool()` returns a `Pool` for transactional or multi-statement
//     work. Pools reuse a WebSocket connection — better for ingestion
//     hot paths that write hundreds of rows.

import { neon, neonConfig, Pool } from "@neondatabase/serverless";

// Node runtime needs a WebSocket polyfill ; Vercel Edge / browser do not.
// The polyfill is loaded once at module init when running outside the
// Edge runtime.
if (
  typeof (globalThis as { WebSocket?: unknown }).WebSocket === "undefined"
) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ws = require("ws");
  neonConfig.webSocketConstructor = ws;
}

function databaseUrl(opts: { pooled?: boolean } = {}): string {
  const pooled = opts.pooled ?? true;
  const url = pooled
    ? process.env.DATABASE_URL || process.env.POSTGRES_URL
    : process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL_NON_POOLING;
  if (!url) {
    throw new Error(
      `Database connection string missing (${pooled ? "pooled" : "unpooled"}). ` +
        "Ensure Neon is connected to the Vercel project and rerun `vercel env pull`.",
    );
  }
  return url;
}

let sqlSingleton: ReturnType<typeof neon> | null = null;
export function getSql() {
  if (!sqlSingleton) sqlSingleton = neon(databaseUrl({ pooled: true }));
  return sqlSingleton;
}

let poolSingleton: Pool | null = null;
export function getPool(): Pool {
  if (!poolSingleton) {
    poolSingleton = new Pool({ connectionString: databaseUrl({ pooled: false }) });
  }
  return poolSingleton;
}
