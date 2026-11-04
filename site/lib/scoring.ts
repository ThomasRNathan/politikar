// TruthScore v1.0.0 — TypeScript port of apps/workers/politikar_workers/scoring.py.
//
// Pure functions over resolved claim rows; no I/O. This is the canonical
// scoring path for the live site (the Python module stays the reference
// implementation and is covered by tests). Kept byte-for-byte faithful to
// the formula in SCORING.md so scores are reproducible and auditable.

export const SCORING_VERSION = "v1.0.0";

export type ScoringClaim = {
  claim_type: string;
  has_numeric: boolean;
  confidence: number;
  topic_tags: string[];
  politician_tier: string; // "P0" | "P1" | "P2"
  source_credibility: number; // 1-5
  verdict: string;
  is_human_reviewed?: boolean;
  used_opus?: boolean;
};

const VERDICT_FACTUAL_T: Record<string, number> = {
  true: 1.0,
  mostly_true: 0.75,
  mixed: 0.5,
  misleading_context: 0.15,
  mostly_false: 0.25,
  false: 0.0,
};
const VERDICT_PROMISE_P: Record<string, number> = {
  kept: 1.0,
  partially_kept: 0.5,
  broken: 0.0,
  abandoned: 0.0,
};
const TIER_WEIGHT: Record<string, number> = { P0: 1.0, P1: 0.8, P2: 0.6 };
const HIGH_PRIORITY_TOPICS = new Set(["economy", "security", "immigration", "health"]);
const MID_PRIORITY_TOPICS = new Set([
  "justice",
  "education",
  "ecology_climate",
  "fiscal_policy",
  "public_debt",
  "europe",
  "foreign_policy",
  "social_protection",
]);

function topicPriority(topicTags: string[]): number {
  const tags = new Set(topicTags);
  for (const t of tags) if (HIGH_PRIORITY_TOPICS.has(t)) return 1.0;
  for (const t of tags) if (MID_PRIORITY_TOPICS.has(t)) return 0.7;
  return 0.5;
}

function credibilityNorm(c: number): number {
  const map: Record<number, number> = { 5: 1.0, 4: 0.9, 3: 0.75, 2: 0.5, 1: 0.25 };
  return map[c] ?? 0.5;
}

function verifiability(claimType: string, hasNumeric: boolean): number {
  if (claimType === "factual_assertion") return hasNumeric ? 1.0 : 0.8;
  if (claimType === "promise") return 0.7;
  if (claimType === "prediction") return 0.5;
  if (claimType === "normative_statement") return 0.3;
  return 0.0; // opinion, rhetorical : excluded
}

export function claimWeight(c: ScoringClaim): number {
  const v = verifiability(c.claim_type, c.has_numeric);
  if (v === 0.0) return 0.0;
  let conf = c.confidence;
  if (c.is_human_reviewed || c.used_opus) conf = Math.min(1.0, conf * 1.05);
  const r =
    0.5 * topicPriority(c.topic_tags) +
    0.3 * (TIER_WEIGHT[c.politician_tier] ?? 0.6) +
    0.2 * credibilityNorm(c.source_credibility);
  return conf * v * r;
}

export function factualScore(rows: ScoringClaim[]): number | null {
  const pairs = rows
    .filter((c) => c.claim_type === "factual_assertion" && Object.hasOwn(VERDICT_FACTUAL_T, c.verdict))
    .map((c) => [claimWeight(c), VERDICT_FACTUAL_T[c.verdict]] as const)
    .filter(([w]) => w > 0);
  if (pairs.length === 0) return null;
  const num = pairs.reduce((a, [w, t]) => a + w * t, 0);
  const den = pairs.reduce((a, [w]) => a + w, 0);
  return (100.0 * num) / den;
}

export function promiseScore(rows: ScoringClaim[]): number | null {
  const pairs = rows
    .filter((c) => c.claim_type === "promise" && Object.hasOwn(VERDICT_PROMISE_P, c.verdict))
    .map((c) => [claimWeight(c), VERDICT_PROMISE_P[c.verdict]] as const)
    .filter(([w]) => w > 0);
  if (pairs.length === 0) return null;
  const num = pairs.reduce((a, [w, p]) => a + w * p, 0);
  const den = pairs.reduce((a, [w]) => a + w, 0);
  return (100.0 * num) / den;
}

export function transparencyScore(rows: ScoringClaim[], hasPublicCorrection = false): number {
  const nFactual = rows.filter((c) => c.claim_type === "factual_assertion").length;
  if (nFactual === 0) return 50.0;
  const nMisleading = rows.filter((c) => c.verdict === "misleading_context").length;
  const nUnverifiable = rows.filter((c) => c.verdict === "unverifiable").length;
  const nNumeric = rows.filter((c) => c.claim_type === "factual_assertion" && c.has_numeric).length;
  let score = 50.0;
  if (hasPublicCorrection) score += 15.0;
  if (nMisleading / nFactual > 0.1) score -= 15.0;
  if (nUnverifiable / Math.max(1, nFactual) > 0.3) score -= 10.0;
  if (nNumeric / nFactual > 0.4) score += 5.0;
  return Math.max(0.0, Math.min(100.0, score));
}

export function isSignificant(rows: ScoringClaim[]): boolean {
  const nF = rows.filter(
    (c) =>
      c.claim_type === "factual_assertion" &&
      Object.hasOwn(VERDICT_FACTUAL_T, c.verdict) &&
      claimWeight(c) > 0,
  ).length;
  const nP = rows.filter(
    (c) =>
      c.claim_type === "promise" &&
      Object.hasOwn(VERDICT_PROMISE_P, c.verdict) &&
      claimWeight(c) > 0,
  ).length;
  return nF >= 30 || nP >= 5;
}

export type ScoreComponents = { f: number | null; p: number | null; tau: number };

export function truthScore(
  rows: ScoringClaim[],
  hasPublicCorrection = false,
): { score: number | null; components: ScoreComponents } {
  const f = factualScore(rows);
  const p = promiseScore(rows);
  const tau = transparencyScore(rows, hasPublicCorrection);
  const components: ScoreComponents = { f, p, tau };
  // A composite score needs at least one substantive signal (see scoring.py).
  if (f === null && p === null) return { score: null, components };
  const weights: Record<string, number> = { f: 0.6, p: 0.3, tau: 0.1 };
  const used = Object.entries(components).filter(([, v]) => v !== null) as [string, number][];
  const norm = used.reduce((a, [k]) => a + weights[k], 0);
  const score = used.reduce((a, [k, v]) => a + weights[k] * v, 0) / norm;
  return { score, components };
}

// Deterministic PRNG (mulberry32) so bootstrap CIs are reproducible, like
// the seeded random.Random in the Python reference.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function bootstrapCi(
  rows: ScoringClaim[],
  hasPublicCorrection = false,
  nIter = 1000,
  seed = 42,
): [number, number] {
  const n = rows.length;
  if (n === 0) return [NaN, NaN];
  const rand = mulberry32(seed);
  const samples: number[] = [];
  for (let i = 0; i < nIter; i++) {
    const resample = Array.from({ length: n }, () => rows[Math.floor(rand() * n)]);
    const { score } = truthScore(resample, hasPublicCorrection);
    if (score !== null) samples.push(score);
  }
  if (samples.length === 0) return [NaN, NaN];
  samples.sort((a, b) => a - b);
  const lo = samples[Math.floor(0.025 * samples.length)];
  const hi = samples[Math.floor(0.975 * samples.length)];
  return [lo, hi];
}

export type TruthScoreResult = {
  truth_score: number | null;
  factual_score: number | null;
  promise_score: number | null;
  transparency_score: number;
  ci_low: number | null;
  ci_high: number | null;
  is_significant: boolean;
  n_factual: number;
  n_promises: number;
};

/** Full score record for a politician from their resolved claim rows. */
export function computeTruthScore(
  rows: ScoringClaim[],
  hasPublicCorrection = false,
): TruthScoreResult {
  const { score, components } = truthScore(rows, hasPublicCorrection);
  const nF = rows.filter(
    (c) => c.claim_type === "factual_assertion" && Object.hasOwn(VERDICT_FACTUAL_T, c.verdict) && claimWeight(c) > 0,
  ).length;
  const nP = rows.filter(
    (c) => c.claim_type === "promise" && Object.hasOwn(VERDICT_PROMISE_P, c.verdict) && claimWeight(c) > 0,
  ).length;
  const [lo, hi] = score !== null ? bootstrapCi(rows, hasPublicCorrection) : [null, null];
  return {
    truth_score: score === null ? null : Math.round(score),
    factual_score: components.f === null ? null : Math.round(components.f),
    promise_score: components.p === null ? null : Math.round(components.p),
    transparency_score: Math.round(components.tau),
    ci_low: lo === null || Number.isNaN(lo) ? null : Math.round(lo),
    ci_high: hi === null || Number.isNaN(hi) ? null : Math.round(hi),
    is_significant: isSignificant(rows),
    n_factual: nF,
    n_promises: nP,
  };
}
