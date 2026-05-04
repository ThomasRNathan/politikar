"""politikar CLI. Run pieces of the pipeline locally for development.

Examples:
    politikar score --input claims.json
    politikar extract --text "Ce que je dis" --speaker "Politique X"
    politikar fetch elysee --limit 10
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from politikar_workers.scoring import (
    ClaimRow,
    bootstrap_ci,
    is_significant,
    truth_score,
)


def cmd_score(args: argparse.Namespace) -> int:
    payload = json.loads(Path(args.input).read_text(encoding="utf-8"))
    rows = [ClaimRow(**r) for r in payload.get("rows", [])]
    sig = is_significant(rows)
    score, components = truth_score(rows, has_public_correction=payload.get("has_public_correction", False))
    lo, hi = bootstrap_ci(rows, n_iter=args.iter, seed=args.seed)
    out = {
        "scoring_version": "v1.0.0",
        "is_significant": sig,
        "truth_score": score,
        "components": components,
        "ci_low": lo,
        "ci_high": hi,
        "n_rows": len(rows),
    }
    print(json.dumps(out, indent=2, ensure_ascii=False))
    return 0


def cmd_extract(args: argparse.Namespace) -> int:
    try:
        from politikar_workers.extraction import ExtractionInput, extract_claims
    except ImportError as e:
        print(f"missing dependencies: {e}", file=sys.stderr)
        return 1
    inp = ExtractionInput(
        politician_full_name=args.speaker,
        politician_function=args.function or "—",
        politician_party=args.party or "—",
        occurred_at=args.date or "—",
        channel=args.channel or "—",
        source_type=args.source_type or "speech",
        text=args.text,
    )
    out = extract_claims(inp)
    print(json.dumps(out, indent=2, ensure_ascii=False))
    return 0


def cmd_fetch(args: argparse.Namespace) -> int:
    if args.connector == "elysee":
        from politikar_workers.sources.elysee import fetch_items

        items = fetch_items(limit=args.limit)
        out = [
            {
                "id": it.id,
                "title": it.title,
                "link": it.link,
                "summary": it.summary,
                "published_at": it.published_at.isoformat() if it.published_at else None,
            }
            for it in items
        ]
        print(json.dumps(out, indent=2, ensure_ascii=False))
        return 0
    print(f"unknown connector: {args.connector}", file=sys.stderr)
    return 1


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="politikar")
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_score = sub.add_parser("score", help="Compute TruthScore from claims JSON.")
    p_score.add_argument("--input", required=True, help="path to JSON {rows: [...]}")
    p_score.add_argument("--iter", type=int, default=1000)
    p_score.add_argument("--seed", type=int, default=42)
    p_score.set_defaults(func=cmd_score)

    p_ex = sub.add_parser("extract", help="Extract claims from a text via Claude (needs API key).")
    p_ex.add_argument("--text", required=True)
    p_ex.add_argument("--speaker", required=True)
    p_ex.add_argument("--function")
    p_ex.add_argument("--party")
    p_ex.add_argument("--date")
    p_ex.add_argument("--channel")
    p_ex.add_argument("--source-type", dest="source_type")
    p_ex.set_defaults(func=cmd_extract)

    p_f = sub.add_parser("fetch", help="Fetch from a connector.")
    p_f.add_argument("connector", choices=["elysee"])
    p_f.add_argument("--limit", type=int, default=10)
    p_f.set_defaults(func=cmd_fetch)

    args = parser.parse_args(argv)
    return int(args.func(args) or 0)


if __name__ == "__main__":
    sys.exit(main())
