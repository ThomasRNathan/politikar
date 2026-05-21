// Smoke test : runs the claim extractor on a single Élysée RSS item
// for Emmanuel Macron and prints the extracted claims. Used to validate
// MISTRAL_API_KEY + AI SDK v6 + the prompt versioning end to end.
//
// Run with : npx tsx scripts/llm/smoke-extract.ts

import path from "node:path";
import { config } from "dotenv";

config({ path: path.resolve(process.cwd(), ".env.local") });

import { fetchElysee } from "../../lib/ingest/elysee";
import { extractClaims } from "../../lib/llm/extract";

async function main() {
  console.log("# Smoke extraction test\n");

  const items = await fetchElysee();
  if (items.length === 0) {
    console.error("No Élysée items fetched. Aborting.");
    process.exit(1);
  }
  // Pick the most recent item with a non-trivial summary.
  const target = items.find((s) => (s.summary?.length ?? 0) > 80) ?? items[0];

  console.log(`source     : ${target.title}`);
  console.log(`url        : ${target.url}`);
  console.log(`occurred_at: ${target.occurred_at}`);
  console.log(`summary    : ${(target.summary ?? "").slice(0, 180)}…`);
  console.log("");

  const text = [target.title, target.summary].filter(Boolean).join("\n\n");

  const start = Date.now();
  try {
    const res = await extractClaims({
      politicianFullName: "Emmanuel Macron",
      politicianFunction: "Président de la République",
      politicianParty: "Renaissance",
      occurredAt: target.occurred_at ?? "",
      channel: target.channel,
      sourceType: target.source_type,
      text,
    });
    const elapsed = Date.now() - start;
    console.log(`✓ extraction done in ${elapsed}ms`);
    console.log(`  model       : ${res.model_id}`);
    console.log(`  prompt      : ${res.prompt_version}`);
    console.log(`  tokens      : in=${res.usage.input_tokens} out=${res.usage.output_tokens}`);
    console.log(`  n_claims    : ${res.output.claims.length}`);
    console.log("");
    for (const [i, c] of res.output.claims.entries()) {
      console.log(`  [${i + 1}] ${c.claim_type} (conf ${c.extraction_confidence})`);
      console.log(`      « ${c.claim_text} »`);
      console.log(`      tags: ${c.topic_tags.join(", ")}`);
      if (c.numeric_values && c.numeric_values.length > 0) {
        console.log(
          `      values: ${c.numeric_values
            .map((v) => `${v.value} ${v.unit}`)
            .join(", ")}`,
        );
      }
      console.log("");
    }
  } catch (e) {
    console.error(`✗ extraction failed: ${(e as Error).message}`);
    if ((e as Error).stack) {
      console.error((e as Error).stack);
    }
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
