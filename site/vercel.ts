// Vercel project configuration. The crons section uses both Hobby-plan
// slots (max 2 per project).
//
// Cron architecture:
//   - /api/cron/extract (daily 04:30 UTC):
//       Full pipeline — fetches from all connectors (Élysée, Gouvernement,
//       NosDéputés, Sénat), extracts claims via Mistral, embeds via Voyage,
//       verifies with fact-checker similarity + INSEE economic context,
//       persists to Neon.
//   - /api/cron/refresh-economic (weekly Mondays 06:00 UTC):
//       Fetches latest INSEE BDM indicators (chômage, inflation) and
//       returns them as JSON. A CI step or manual commit updates
//       data/economic-snapshot.json so the next build picks it up.
//       (Vercel filesystem is read-only post-build; cannot write in-process.)
//
// Docs : https://vercel.com/docs/project-configuration/vercel-ts
import type { VercelConfig } from "@vercel/config/v1";

export const config: VercelConfig = {
  framework: "nextjs",
  crons: [
    // Daily LLM extraction : new sources → Mistral → claims in Neon.
    { path: "/api/cron/extract", schedule: "30 4 * * *" },
    // Weekly economic refresh : INSEE BDM → latest indicators JSON.
    { path: "/api/cron/refresh-economic", schedule: "0 6 * * 1" },
  ],
};
