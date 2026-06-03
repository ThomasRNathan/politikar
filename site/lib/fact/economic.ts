// Economic fact lookup for the verification cascade.
//
// Loads the bundled economic-snapshot.json (INSEE / Eurostat indicators)
// and matches relevant indicators against a claim text based on keyword
// overlap. The matched indicators are injected into the Mistral
// verification prompt so the model can compare what the politician said
// against real, sourced numbers.
//
// Matching is intentionally permissive: we prefer false positives (a
// slightly irrelevant indicator injected) over false negatives (missing
// a relevant figure). The LLM filters relevance; our job is recall.

import snapshot from "@/data/economic-snapshot.json";

type RawIndicator = {
  id: string;
  label: string;
  value: number;
  unit: string;
  period: string;
  direction: string;
  source: string;
  url: string;
  keywords: string[];
};

type RawSnapshot = {
  updated_at: string;
  indicators: RawIndicator[];
};

const { updated_at, indicators } = snapshot as RawSnapshot;

export type EconomicIndicator = RawIndicator;

/**
 * Find indicators whose keywords appear in the claim text.
 * Returns up to `maxHits` best matches (most keyword overlaps first).
 */
export function matchIndicators(
  claimText: string,
  { maxHits = 4 }: { maxHits?: number } = {},
): EconomicIndicator[] {
  const lower = claimText.toLowerCase();

  const scored = indicators
    .map((ind) => {
      const hits = ind.keywords.filter((kw) => lower.includes(kw.toLowerCase()));
      return { ind, hits: hits.length };
    })
    .filter(({ hits }) => hits > 0)
    .sort((a, b) => b.hits - a.hits);

  return scored.slice(0, maxHits).map(({ ind }) => ind);
}

/**
 * Format matched indicators as a compact text block suitable for
 * injecting into the Mistral verification prompt. Returns empty string
 * when no indicators match.
 */
export function formatIndicatorsForPrompt(claimText: string): string {
  const matched = matchIndicators(claimText);
  if (matched.length === 0) return "";

  const lines = matched.map(
    (ind) =>
      `- ${ind.label} : ${ind.value} ${ind.unit} (${ind.period}) [source: ${ind.source} — ${ind.url}]`,
  );

  return [
    `Données officielles correspondantes (${updated_at.slice(0, 10)}) :`,
    ...lines,
  ].join("\n");
}

/** All indicators, sorted by label. Useful for the /methode page. */
export function allIndicators(): EconomicIndicator[] {
  return [...indicators].sort((a, b) => a.label.localeCompare(b.label, "fr"));
}
