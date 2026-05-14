// Vercel project configuration (replaces vercel.json). The crons section
// schedules our daily ingestion. Hobby plan supports 2 daily crons per
// project — we use 1.
//
// Docs : https://vercel.com/docs/project-configuration/vercel-ts
import type { VercelConfig } from "@vercel/config/v1";

export const config: VercelConfig = {
  framework: "nextjs",
  crons: [
    // Daily ingestion : Élysée RSS + fact-checker corpus.
    // 04:00 UTC = 05:00 Paris (CET) / 06:00 Paris (CEST).
    { path: "/api/cron/daily", schedule: "0 4 * * *" },
  ],
};
