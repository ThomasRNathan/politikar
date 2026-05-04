# apps/workers

Pipelines Python : ingestion, extraction de claims (Claude), vérification
en cascade, scoring TruthScore. Hébergé sur Inngest Cloud (production) ou
exécuté en local pour le dev.

Python ≥ 3.11. Géré avec [uv](https://docs.astral.sh/uv/).

## Installation locale

```bash
# Installer uv une fois
curl -LsSf https://astral.sh/uv/install.sh | sh

# Depuis la racine du repo
uv sync --all-extras
```

`uv sync` installe à la fois `apps/api` et `apps/workers` grâce à la
configuration workspace dans le `pyproject.toml` racine.

## Variables d'environnement

```bash
cp .env.example .env
# Renseigner ANTHROPIC_API_KEY, VOYAGE_API_KEY, SUPABASE_*
```

Sans `ANTHROPIC_API_KEY`, l'extraction (`politikar extract`) échoue
proprement avec un message explicite. Le scoring (`politikar score`) et
le fetch (`politikar fetch elysee`) tournent sans clé.

## Commandes utiles

```bash
# Scoring local
echo '{"rows":[{"claim_type":"factual_assertion","has_numeric":true,"confidence":0.85,"verdict":"true","topic_tags":["economy"],"politician_tier":"P0","source_credibility":4}]}' > /tmp/in.json
uv run politikar score --input /tmp/in.json

# Pull Élysée RSS
uv run politikar fetch elysee --limit 5

# Extract claims (clé API requise)
uv run politikar extract \
  --speaker "Emmanuel Macron" \
  --function "Président de la République" \
  --party "Renaissance" \
  --date "2026-04-29" \
  --channel "Élysée" \
  --source-type "official_statement" \
  --text "Le chômage est passé sous la barre des 7 %."
```

## Structure

```
politikar_workers/
  scoring.py             # TruthScore v1.0.0 (cf SCORING.md)
  extraction.py          # extract_claims(text) → tool output
  prompts/
    claim_extraction.py  # claim_extraction@v1.0.0
    verification_cascade.py
  sources/
    elysee.py            # Élysée RSS connector
  clients/
    anthropic_client.py  # Claude wrapper avec prompt caching
  pipeline/              # Inngest functions (à compléter)
  cli.py                 # entrée `politikar`
tests/
  test_scoring.py        # 3 exemples de SCORING.md + invariants
```

## Tests

```bash
uv run pytest apps/workers
```

Les tests couvrent la formule TruthScore (les 3 exemples chiffrés de
SCORING.md), les invariants (monotonie, stabilité du bootstrap,
exclusion des opinions), et les cas limites.

## Statut d'implémentation

| Composant | Statut | Notes |
|---|---|---|
| `scoring.py` | ✓ complet | formule v1.0.0, bootstrap CI, tests |
| `prompts/claim_extraction` | ✓ complet | system + tool schema |
| `prompts/verification_cascade` | ✓ complet | system + tool schema |
| `extraction.py` | ✓ runnable | nécessite `ANTHROPIC_API_KEY` |
| `clients/anthropic_client` | ✓ runnable | retries, prompt caching ephemeral |
| `sources/elysee.py` | ✓ runnable | RSS parsé, dédup par sha link |
| `sources/nosdeputes` | ⏳ TODO | XVIIe légis pas encore couverte |
| `sources/factcheckers` | ⏳ TODO | Décodeurs + Surligneurs RSS |
| `sources/insee` | ⏳ TODO | API SDMX (OAuth optionnel) |
| `verify.py` (cascade) | ⏳ TODO | wraps prompt 4 + lookups |
| `pipeline/` (Inngest) | ⏳ TODO | crons et fan-out |

## Ressources

- `ARCHITECTURE.md` (racine)
- `DATA_MODEL.md` (racine)
- `PROMPTS.md` (racine)
- `SCORING.md` (racine)
