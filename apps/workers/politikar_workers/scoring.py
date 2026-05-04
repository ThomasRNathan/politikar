"""TruthScore v1.0.0.

Implements the formula documented in `SCORING.md`. Pure function over a
list of `ClaimRow` records. No I/O. The CLI wraps it for batch scoring.
"""
from __future__ import annotations

import random
from dataclasses import dataclass, field
from typing import Iterable, Literal

SCORING_VERSION = "v1.0.0"

ClaimType = Literal[
    "factual_assertion",
    "promise",
    "opinion",
    "rhetorical",
    "prediction",
    "normative_statement",
]
FactualVerdict = Literal[
    "true",
    "mostly_true",
    "mixed",
    "misleading_context",
    "mostly_false",
    "false",
    "unverifiable",
]
PromiseVerdict = Literal[
    "kept",
    "partially_kept",
    "broken",
    "in_progress",
    "abandoned",
    "too_early",
]

VERDICT_FACTUAL_T: dict[str, float] = {
    "true": 1.0,
    "mostly_true": 0.75,
    "mixed": 0.5,
    "misleading_context": 0.15,
    "mostly_false": 0.25,
    "false": 0.0,
}
VERDICT_PROMISE_P: dict[str, float] = {
    "kept": 1.0,
    "partially_kept": 0.5,
    "broken": 0.0,
    "abandoned": 0.0,
}
TIER_WEIGHT: dict[str, float] = {"P0": 1.0, "P1": 0.8, "P2": 0.6}
HIGH_PRIORITY_TOPICS = {"economy", "security", "immigration", "health"}
MID_PRIORITY_TOPICS = {
    "justice",
    "education",
    "ecology_climate",
    "fiscal_policy",
    "public_debt",
    "europe",
    "foreign_policy",
    "social_protection",
}


@dataclass(slots=True)
class ClaimRow:
    claim_type: ClaimType
    has_numeric: bool
    confidence: float
    topic_tags: list[str] = field(default_factory=list)
    politician_tier: str = "P2"
    source_credibility: int = 3
    verdict: str = "unverifiable"
    is_human_reviewed: bool = False
    used_opus: bool = False


def topic_priority(topic_tags: Iterable[str]) -> float:
    tags = set(topic_tags)
    if tags & HIGH_PRIORITY_TOPICS:
        return 1.0
    if tags & MID_PRIORITY_TOPICS:
        return 0.7
    return 0.5


def credibility_norm(c: int) -> float:
    return {5: 1.0, 4: 0.9, 3: 0.75, 2: 0.5, 1: 0.25}.get(c, 0.5)


def verifiability(claim_type: str, has_numeric: bool) -> float:
    if claim_type == "factual_assertion":
        return 1.0 if has_numeric else 0.8
    if claim_type == "promise":
        return 0.7
    if claim_type == "prediction":
        return 0.5
    if claim_type == "normative_statement":
        return 0.3
    return 0.0  # opinion, rhetorical : excluded


def claim_weight(c: ClaimRow) -> float:
    v = verifiability(c.claim_type, c.has_numeric)
    if v == 0.0:
        return 0.0
    conf = c.confidence
    if c.is_human_reviewed or c.used_opus:
        conf = min(1.0, conf * 1.05)
    r = (
        0.5 * topic_priority(c.topic_tags)
        + 0.3 * TIER_WEIGHT.get(c.politician_tier, 0.6)
        + 0.2 * credibility_norm(c.source_credibility)
    )
    return conf * v * r


def factual_score(rows: list[ClaimRow]) -> float | None:
    pairs = [
        (claim_weight(c), VERDICT_FACTUAL_T[c.verdict])
        for c in rows
        if c.claim_type == "factual_assertion" and c.verdict in VERDICT_FACTUAL_T
    ]
    pairs = [(w, t) for (w, t) in pairs if w > 0]
    if not pairs:
        return None
    num = sum(w * t for w, t in pairs)
    den = sum(w for w, _ in pairs)
    return 100.0 * num / den


def promise_score(rows: list[ClaimRow]) -> float | None:
    pairs = [
        (claim_weight(c), VERDICT_PROMISE_P[c.verdict])
        for c in rows
        if c.claim_type == "promise" and c.verdict in VERDICT_PROMISE_P
    ]
    pairs = [(w, p) for (w, p) in pairs if w > 0]
    if not pairs:
        return None
    num = sum(w * p for w, p in pairs)
    den = sum(w for w, _ in pairs)
    return 100.0 * num / den


def transparency_score(
    rows: list[ClaimRow],
    has_public_correction: bool = False,
) -> float:
    n_factual = sum(1 for c in rows if c.claim_type == "factual_assertion")
    if n_factual == 0:
        return 50.0
    n_misleading = sum(1 for c in rows if c.verdict == "misleading_context")
    n_unverifiable = sum(1 for c in rows if c.verdict == "unverifiable")
    n_numeric = sum(
        1 for c in rows if c.claim_type == "factual_assertion" and c.has_numeric
    )
    score = 50.0
    if has_public_correction:
        score += 15.0
    if n_misleading / n_factual > 0.10:
        score -= 15.0
    if n_unverifiable / max(1, n_factual) > 0.30:
        score -= 10.0
    if n_numeric / n_factual > 0.40:
        score += 5.0
    return max(0.0, min(100.0, score))


def is_significant(rows: list[ClaimRow]) -> bool:
    n_f = sum(
        1
        for c in rows
        if c.claim_type == "factual_assertion"
        and c.verdict in VERDICT_FACTUAL_T
        and claim_weight(c) > 0
    )
    n_p = sum(
        1
        for c in rows
        if c.claim_type == "promise"
        and c.verdict in VERDICT_PROMISE_P
        and claim_weight(c) > 0
    )
    return n_f >= 30 or n_p >= 5


def truth_score(
    rows: list[ClaimRow],
    has_public_correction: bool = False,
) -> tuple[float | None, dict[str, float | None]]:
    f = factual_score(rows)
    p = promise_score(rows)
    tau = transparency_score(rows, has_public_correction)
    weights = {"f": 0.6, "p": 0.3, "tau": 0.1}
    components: dict[str, float | None] = {"f": f, "p": p, "tau": tau}
    used = {k: weights[k] for k, v in components.items() if v is not None}
    if not used:
        return None, components
    norm = sum(used.values())
    score = sum(used[k] * components[k] for k in used) / norm  # type: ignore[operator]
    return score, components


def bootstrap_ci(
    rows: list[ClaimRow],
    has_public_correction: bool = False,
    n_iter: int = 1000,
    seed: int = 42,
) -> tuple[float, float]:
    rng = random.Random(seed)
    samples: list[float] = []
    n = len(rows)
    if n == 0:
        return (float("nan"), float("nan"))
    for _ in range(n_iter):
        resample = [rows[rng.randrange(n)] for _ in range(n)]
        score, _ = truth_score(resample, has_public_correction)
        if score is not None:
            samples.append(score)
    if not samples:
        return (float("nan"), float("nan"))
    samples.sort()
    lo = samples[int(0.025 * len(samples))]
    hi = samples[int(0.975 * len(samples))]
    return (lo, hi)
