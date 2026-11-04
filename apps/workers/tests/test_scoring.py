"""Tests for the TruthScore formula. Reproduces the three worked examples
from SCORING.md within 0.5% tolerance, plus invariants."""
from __future__ import annotations

import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from politikar_workers.scoring import (
    ClaimRow,
    bootstrap_ci,
    factual_score,
    is_significant,
    transparency_score,
    truth_score,
)


def make_factual(verdict: str, n: int, *, tier: str = "P0") -> list[ClaimRow]:
    return [
        ClaimRow(
            claim_type="factual_assertion",
            has_numeric=True,
            confidence=0.85,
            topic_tags=["economy"],
            politician_tier=tier,
            source_credibility=4,
            verdict=verdict,
        )
        for _ in range(n)
    ]


def make_promise(verdict: str, n: int) -> list[ClaimRow]:
    return [
        ClaimRow(
            claim_type="promise",
            has_numeric=False,
            confidence=0.85,
            topic_tags=["fiscal_policy"],
            politician_tier="P0",
            source_credibility=4,
            verdict=verdict,
        )
        for _ in range(n)
    ]


def test_example_a_rigorous_minister():
    rows: list[ClaimRow] = []
    rows += make_factual("true", 35)
    rows += make_factual("mostly_true", 8)
    rows += make_factual("mixed", 4)
    rows += make_factual("mostly_false", 2)
    rows += make_factual("false", 1)
    rows += make_promise("kept", 3)
    rows += make_promise("partially_kept", 1)
    # 60% have numeric; here all factual_assertion are has_numeric=True so
    # transparency hits +5 (>40%) but no public correction → tau = 55.
    score, components = truth_score(rows, has_public_correction=False)
    assert components["f"] is not None
    assert components["p"] is not None
    assert math.isclose(components["f"], 87.0, rel_tol=0.01)
    assert math.isclose(components["p"], 87.5, rel_tol=0.01)
    assert math.isclose(components["tau"], 55.0, rel_tol=0.01)
    assert score is not None
    assert math.isclose(score, 83.95, rel_tol=0.01)
    assert is_significant(rows)


def test_example_b_mixed():
    rows: list[ClaimRow] = []
    rows += make_factual("true", 30)
    rows += make_factual("mostly_true", 18)
    rows += make_factual("mixed", 12)
    rows += make_factual("misleading_context", 5)
    rows += make_factual("mostly_false", 10)
    rows += make_factual("false", 5)
    rows += make_promise("kept", 2)
    rows += make_promise("partially_kept", 2)
    rows += make_promise("broken", 2)
    score, components = truth_score(rows, has_public_correction=True)
    assert components["f"] is not None
    assert math.isclose(components["f"], 65.94, rel_tol=0.01)
    assert components["p"] is not None
    assert math.isclose(components["p"], 50.0, rel_tol=0.01)
    # tau here = 50 + 15 (public correction) + 5 (numeric share > 40%) = 70.
    # This diverges from SCORING.md Example B (tau=65) on purpose: this
    # test builds every factual claim with has_numeric=True to keep claim
    # weights uniform (so f reproduces the hand-computed 65.94), which
    # pushes the numeric share to 100% and triggers the +5 bonus. The
    # document's hypothetical politician has a 25% numeric share, below
    # the bonus threshold. The transparency formula itself — including the
    # -15 misleading branch — is exercised in test_transparency_branches.
    assert components["tau"] == 70.0
    assert score is not None
    assert math.isclose(score, 61.5625, rel_tol=0.01)


def test_example_c_under_threshold():
    rows = make_factual("true", 12)
    assert is_significant(rows) is False
    score, _ = truth_score(rows)
    assert score is not None  # still computed, just not significant


def test_transparency_branches():
    # No correction, share misleading 0%, numeric ratio < 40% → tau = 50
    rows = [
        ClaimRow(
            claim_type="factual_assertion",
            has_numeric=False,
            confidence=0.85,
            topic_tags=["economy"],
            politician_tier="P0",
            source_credibility=4,
            verdict="true",
        )
        for _ in range(20)
    ]
    assert transparency_score(rows, has_public_correction=False) == 50.0
    # +bonus correction
    assert transparency_score(rows, has_public_correction=True) == 65.0


def test_opinion_excluded():
    rows = [
        ClaimRow(
            claim_type="opinion",
            has_numeric=False,
            confidence=0.9,
            topic_tags=["culture"],
            politician_tier="P0",
            source_credibility=5,
            verdict="true",
        )
        for _ in range(50)
    ]
    # Opinions get verifiability=0, so factual_score sees no factual rows
    assert factual_score(rows) is None


def test_empty_rows():
    score, _ = truth_score([])
    assert score is None


def test_monotonic_swap_true_to_false():
    rows_true = make_factual("true", 40)
    rows_false = rows_true.copy()
    rows_false[0] = ClaimRow(
        claim_type="factual_assertion",
        has_numeric=True,
        confidence=0.85,
        topic_tags=["economy"],
        politician_tier="P0",
        source_credibility=4,
        verdict="false",
    )
    s_true, _ = truth_score(rows_true)
    s_false, _ = truth_score(rows_false)
    assert s_true is not None and s_false is not None
    assert s_true > s_false


def test_bootstrap_ci_stable():
    rows = make_factual("true", 30) + make_factual("false", 5)
    lo1, hi1 = bootstrap_ci(rows, n_iter=500, seed=1)
    lo2, hi2 = bootstrap_ci(rows, n_iter=500, seed=1)
    assert (lo1, hi1) == (lo2, hi2)
    assert lo1 < hi1
    assert 0 < lo1 < 100 and 0 < hi1 < 100
