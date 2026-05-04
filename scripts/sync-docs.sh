#!/usr/bin/env bash
# Copies the canonical design docs at the repo root into site/content/docs/
# so the Next.js site can read them at build time. Run before each deploy.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$ROOT/site/content/docs"

mkdir -p "$DEST"

for f in ARCHITECTURE.md DATA_MODEL.md SOURCES.md PROMPTS.md SCORING.md RISKS.md; do
  cp "$ROOT/$f" "$DEST/$f"
  echo "synced: $f"
done
