# politikar

Plateforme open-source d'analyse systématique de la véracité du discours
politique français.

> Statut : phase 0/1 du master plan. Les fondations (référentiel,
> ingestion partielle, scoring, prompts versionnés, schéma DB, cron
> Vercel) sont en place. L'extraction LLM et la cascade de vérification
> s'activent dès qu'on provisionne Mistral + Neon + Vercel Blob (tous
> trois en free tier).

## Démo en ligne

👉 **<https://politikar.com>**

Ce que tu y vois aujourd'hui :

- Référentiel réel (59 figures nationales, 14 partis, 13 régions) avec
  photos et logos depuis Wikimedia Commons.
- Communications officielles ingérées en temps réel depuis Élysée RSS,
  gouvernement.fr / info.gouv.fr et les communiqués de partis.
- Corpus de fact-checks de référence (Les Décodeurs, Les Surligneurs,
  AFP Factuel, France Info, CheckNews).
- Maquette d'analyse (TruthScore, intervalles de confiance,
  décomposition par sujet et par fonction) sur des verdicts illustratifs
  en attendant que la cascade tourne.

## Architecture

```
politikar/
  apps/
    api/              FastAPI admin + ingestion (Python 3.11+)
    workers/          Inngest workers, scoring, extraction (Python 3.11+)
  packages/
    db/migrations/    Postgres 15 + pgvector schema
  site/               Next.js 16 App Router, RSC, Tailwind 4
                       (à déplacer dans apps/web/ post-Phase 0)
  ARCHITECTURE.md
  DATA_MODEL.md
  SOURCES.md
  PROMPTS.md
  SCORING.md
  RISKS.md
```

Stack résumée (cible MVP à 0 €/mois) :

- Frontend public : Next.js 16 + React 19 + Tailwind 4
- API publique read-only : Next.js Route Handlers
- API admin et ingestion : FastAPI servi via **Vercel Python Functions**
  (Fluid Compute supporte Python 3.13/3.14 nativement)
- Workers / crons : **Vercel Cron** (1 cron quotidien Hobby) +
  Vercel Workflow DevKit ou Inngest plus tard si pipelines multi-étapes
- DB : **Neon Postgres** via Vercel Marketplace (free, pgvector, pas
  d'auto-pause) ; alternative Supabase si tu préfères
- LLM : **Mistral La Plateforme** `mistral-small-latest` (free tier, FR) ;
  fallback Anthropic Claude pour verdicts P0 sensibles si budget débloqué
- Embeddings : Voyage AI `voyage-3-large` (free tier 50M tokens/mo)
- File storage : **Vercel Blob** (free 1 GB sur Hobby) pour les snapshots
  d'ingestion
- Transcription audio : skip MVP ; OpenAI Whisper si on ajoute des
  sources audio plus tard
- Hébergement : **Vercel Hobby** pour le front, l'API admin et les crons

## Bootstrap (développeur)

### Pré-requis

- Node ≥ 20 (idéal : 24 LTS)
- Python ≥ 3.11 (le scoring et les prompts utilisent `dataclass(slots=True)`)
- [uv](https://docs.astral.sh/uv/) pour la gestion des deps Python
- [Vercel CLI](https://vercel.com/docs/cli) ≥ 53
- [Supabase CLI](https://supabase.com/docs/reference/cli) (optionnel mais
  recommandé pour appliquer les migrations)

### Installation

```bash
git clone https://github.com/ThomasRNathan/politikar.git
cd politikar

# 1. Front Next.js
cd site && npm install && cd ..

# 2. Python workspace (api + workers)
uv sync --all-extras --workspace

# 3. Variables d'environnement
cp .env.example .env.local         # pour le front
cp .env.example apps/api/.env      # pour la FastAPI
cp .env.example apps/workers/.env  # pour les workers
# Renseigner ANTHROPIC_API_KEY, VOYAGE_API_KEY, SUPABASE_*, ...
```

### Faire tourner localement

```bash
# Front
cd site && npm run dev                 # → http://localhost:3000

# API admin
uv run uvicorn politikar_api.main:app --reload --port 8000

# Refresh des données ingérées (Élysée + fact-checkers)
cd site && npm run ingest

# Tests Python
uv run pytest apps/workers -q

# Tests Playwright (contre la prod par défaut)
cd site && npm test
```

### Appliquer les migrations Supabase

```bash
supabase login
supabase link --project-ref <votre-ref>
supabase db push                       # applique packages/db/migrations/*
```

Sans Supabase CLI :

```bash
export DATABASE_URL=postgresql://...
for f in packages/db/migrations/*.sql; do
  psql "$DATABASE_URL" -f "$f"
done
```

## Provisionner la stack à 0 €/mois

Tout ce qui suit a un free tier suffisant pour le MVP politikar. Aucune
carte bancaire requise.

| Service | Pourquoi | Action |
|---|---|---|
| Mistral La Plateforme | LLM extraction + verdicts | console.mistral.ai → API Keys → copier dans `MISTRAL_API_KEY` |
| Voyage AI | Embeddings claims | voyageai.com → générer une clé → `VOYAGE_API_KEY` |
| Neon Postgres | DB + pgvector, sans auto-pause | Vercel dashboard → Storage → Marketplace → Neon → Free → Connect to politikar |
| Vercel Blob | Snapshots d'ingestion | Vercel dashboard → Storage → Create Blob Store → Connect to politikar |
| Vercel Cron | 1 cron quotidien | déjà configuré dans `site/vercel.ts`, actif au prochain deploy |
| Sentry | Monitoring erreurs | sentry.io → projet free → `SENTRY_DSN` |

Une fois ces services connectés, faire un `vercel env pull .env.local`
pour rapatrier les variables auto-injectées par Vercel Marketplace.

## Statut d'implémentation par phase

Référence : section "Plan de livraison" du master prompt.

| Phase | Statut | Notes |
|---|---|---|
| 0. Fondations | ⏳ partiel | Monorepo, migrations Supabase, scaffolds Python, CI GitHub Actions, .env.example |
| 1. Référentiel et données statiques | ✓ MVP | 59 figures via Wikidata + Wikipedia (gouvernement Lecornu II à jour), photos + logos, seedées dans Neon. |
| 2. Pipeline d'ingestion v1 | ✓ MVP | Connecteurs Élysée, gouvernement.fr/info.gouv.fr, communiqués de partis (LFI, LR) et corpus fact-checkers. NosDéputés branché mais en sommeil (API sur la XVIe légis. uniquement) ; AN open data à brancher. |
| 3. Extraction et classification de claims | ⏳ scaffold | Prompts versionnés et runnable via `politikar extract`, nécessite ANTHROPIC_API_KEY |
| 4. Moteur de vérification v1 | ⏳ scaffold | Prompt v1 + tool schema définis. Cascade Python à coder, après Supabase. |
| 5. Agrégations et scoring | ✓ formule | TruthScore v1.0.0 implémenté en Python avec tests reproduisant les exemples de SCORING.md |
| 6. Frontend complet | ✓ MVP | Carte hex, profils, partis, fonctions, régions, claims, méthode, docs |
| 7. Suivi promesses | ⏳ TODO | Programme 2022 + 2024 à ingérer |
| 8. Polish + lancement | ⏳ TODO | Audit éditorial, contributing guide, statut juridique |

## Documents de cadrage

- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [DATA_MODEL.md](./DATA_MODEL.md)
- [SOURCES.md](./SOURCES.md)
- [PROMPTS.md](./PROMPTS.md)
- [SCORING.md](./SCORING.md)
- [RISKS.md](./RISKS.md)

## Licence

Proposition AGPL-3.0 (cf. ARCHITECTURE section 11). À valider avant
publication officielle.

## Crédits

- Photos et logos politiques : Wikimedia Commons (CC BY-SA majoritairement),
  attribution dans le pied de page du site.
- Communications officielles : Élysée (Licence Etalab 2.0).
- Fact-checks : Les Décodeurs (Le Monde) et Les Surligneurs (citation
  obligatoire, lien systématique).
