// Seeds the Neon database with the politikar referential : regions,
// parties, functions, politicians, and the illustrative truth scores.
// Claims and verifications are NOT seeded here — those come from the
// real extraction pipeline once an LLM key is available.
//
// Idempotent : re-running upserts on (country, slug) so the script can
// be invoked freely without duplicating rows.

import path from "node:path";
import { Client, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { config } from "dotenv";

config({ path: path.resolve(process.cwd(), ".env.local") });
neonConfig.webSocketConstructor = ws;

import { PARTIES, FUNCTIONS, REGIONS, POLITICIANS } from "../../lib/fixtures";

type IdMap = Map<string, string>; // fixture id -> uuid

async function upsertRegions(client: Client): Promise<IdMap> {
  const map: IdMap = new Map();
  for (const r of REGIONS) {
    const { rows } = await client.query<{ id: string }>(
      `insert into regions (country, level, name, slug)
       values ('fr', 'region', $1, $2)
       on conflict (country, slug) do update set name = excluded.name, updated_at = now()
       returning id`,
      [r.name, r.slug]
    );
    map.set(r.id, rows[0].id);
  }
  return map;
}

async function upsertParties(client: Client): Promise<IdMap> {
  const map: IdMap = new Map();
  for (const p of PARTIES) {
    const { rows } = await client.query<{ id: string }>(
      `insert into parties (country, name, short_name, slug, political_family, color_hex, logo_url)
       values ('fr', $1, $2, $3, $4, $5, $6)
       on conflict (country, slug) do update set
         name = excluded.name,
         short_name = excluded.short_name,
         political_family = excluded.political_family,
         color_hex = excluded.color_hex,
         logo_url = excluded.logo_url,
         updated_at = now()
       returning id`,
      [p.name, p.short_name, p.slug, p.political_family, p.color_hex, p.logo_url]
    );
    map.set(p.id, rows[0].id);
  }
  return map;
}

async function upsertFunctions(client: Client): Promise<IdMap> {
  const map: IdMap = new Map();
  for (const f of FUNCTIONS) {
    const { rows } = await client.query<{ id: string }>(
      `insert into functions (country, name, slug, level)
       values ('fr', $1, $2, $3)
       on conflict (country, slug) do update set
         name = excluded.name,
         level = excluded.level,
         updated_at = now()
       returning id`,
      [f.name, f.slug, f.level]
    );
    map.set(f.id, rows[0].id);
  }
  return map;
}

async function upsertPoliticians(
  client: Client,
  parties: IdMap,
  functions: IdMap,
  regions: IdMap,
): Promise<IdMap> {
  const map: IdMap = new Map();
  for (const pol of POLITICIANS) {
    const partyUuid = parties.get(pol.party_id);
    const funcUuid = functions.get(pol.function_id);
    const regionUuid = pol.region_id ? regions.get(pol.region_id) : null;
    if (!partyUuid || !funcUuid) {
      throw new Error(
        `politician ${pol.slug} references unknown party=${pol.party_id} or function=${pol.function_id}`
      );
    }
    const birthDate = pol.birth_year ? `${pol.birth_year}-01-01` : null;
    const { rows } = await client.query<{ id: string }>(
      `insert into politicians (
         country, full_name, given_name, family_name, slug, birth_date, gender,
         current_party_id, current_function_id, current_region_id,
         photo_url, tier
       ) values ('fr', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       on conflict (country, slug) do update set
         full_name = excluded.full_name,
         given_name = excluded.given_name,
         family_name = excluded.family_name,
         birth_date = excluded.birth_date,
         gender = excluded.gender,
         current_party_id = excluded.current_party_id,
         current_function_id = excluded.current_function_id,
         current_region_id = excluded.current_region_id,
         photo_url = excluded.photo_url,
         tier = excluded.tier,
         updated_at = now()
       returning id`,
      [
        pol.full_name,
        pol.given_name,
        pol.family_name,
        pol.slug,
        birthDate,
        pol.gender,
        partyUuid,
        funcUuid,
        regionUuid,
        pol.photo_url,
        pol.tier,
      ]
    );
    map.set(pol.id, rows[0].id);
  }
  return map;
}

async function upsertTruthScores(client: Client, politicians: IdMap) {
  let count = 0;
  for (const pol of POLITICIANS) {
    const uuid = politicians.get(pol.id);
    if (!uuid) continue;
    const s = pol.stats;
    const topicBreakdown = Object.fromEntries(
      Object.entries(s.topic_breakdown).map(([k, v]) => [
        k,
        v ? { score: v.score, n: v.n, ci: v.ci } : null,
      ])
    );
    await client.query(
      `insert into politician_truth_scores (
         politician_id, truth_score, factual_score, promise_score,
         transparency_score, ci_low, ci_high, topic_breakdown,
         is_significant, scoring_version, computed_at
       ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'v1.0.0', now())
       on conflict (politician_id) do update set
         truth_score = excluded.truth_score,
         factual_score = excluded.factual_score,
         promise_score = excluded.promise_score,
         transparency_score = excluded.transparency_score,
         ci_low = excluded.ci_low,
         ci_high = excluded.ci_high,
         topic_breakdown = excluded.topic_breakdown,
         is_significant = excluded.is_significant,
         computed_at = now()`,
      [
        uuid,
        s.truth_score,
        s.factual_score,
        s.promise_score,
        s.transparency_score,
        s.ci_low,
        s.ci_high,
        JSON.stringify(topicBreakdown),
        s.is_significant,
      ]
    );
    count++;
  }
  return count;
}

async function main() {
  const url = process.env.DATABASE_URL_UNPOOLED;
  if (!url) throw new Error("DATABASE_URL_UNPOOLED missing");
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    console.log("# Seeding politikar referential into Neon");
    const regions = await upsertRegions(client);
    console.log(`  regions   : ${regions.size}`);
    const parties = await upsertParties(client);
    console.log(`  parties   : ${parties.size}`);
    const functions = await upsertFunctions(client);
    console.log(`  functions : ${functions.size}`);
    const politicians = await upsertPoliticians(client, parties, functions, regions);
    console.log(`  politicians : ${politicians.size}`);
    const scoresN = await upsertTruthScores(client, politicians);
    console.log(`  truth_scores: ${scoresN}`);
    console.log("\n✓ seed complete");
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
