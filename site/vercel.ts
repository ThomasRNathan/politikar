// Vercel project configuration (replaces vercel.json). The crons section
// schedules our daily pipeline. Hobby plan allows 2 daily crons per
// project — we use both : raw ingestion at 04:00 UTC, LLM extraction at
// 04:30 UTC (so sources are persisted before extract runs).
//
// Docs : https://vercel.com/docs/project-configuration/vercel-ts
import type { VercelConfig } from "@vercel/config/v1";

export const config: VercelConfig = {
  framework: "nextjs",
  crons: [
    // Daily ingestion : Élysée RSS + fact-checker corpus → Vercel Blob.
    { path: "/api/cron/daily", schedule: "0 4 * * *" },
    // Daily LLM extraction : new sources → Mistral → claims in Neon.
    { path: "/api/cron/extract", schedule: "30 4 * * *" },
  ],
};
