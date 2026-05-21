// Tiny diagnostic endpoint. Returns the length and prefix of selected
// env vars so the user can verify from the live deployment whether the
// keys are actually stored. NEVER returns full secret values — just
// metadata (length, first 3 chars, last 2 chars) which is enough to
// distinguish "set with a real key" from "set with empty string".

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function probe(name: string) {
  const v = process.env[name];
  if (v === undefined) return { present: false };
  return {
    present: true,
    length: v.length,
    looks_empty: v.length === 0,
    // safe peek : not enough to leak a usable key, but enough to tell
    // "I pasted the right thing" vs "I pasted nothing"
    starts_with: v.slice(0, 3),
    ends_with: v.length > 5 ? v.slice(-2) : "",
  };
}

export async function GET() {
  return NextResponse.json({
    deployed_at: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
    region: process.env.VERCEL_REGION ?? "—",
    env: {
      MISTRAL_API_KEY: probe("MISTRAL_API_KEY"),
      VOYAGE_API_KEY: probe("VOYAGE_API_KEY"),
      SENTRY_DSN: probe("SENTRY_DSN"),
      DATABASE_URL: probe("DATABASE_URL"),
      BLOB_READ_WRITE_TOKEN: probe("BLOB_READ_WRITE_TOKEN"),
      CRON_SECRET: probe("CRON_SECRET"),
    },
    timestamp: new Date().toISOString(),
  });
}
