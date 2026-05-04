# politikar

Plateforme open-source d'analyse systématique de la véracité du discours politique français.

> Statut : design phase. Aucun code produit pour le moment. Les six documents de cadrage ci-dessous sont en cours de relecture avant l'écriture de la Phase 0.

## Mission

Pour chaque homme et femme politique, parti, région et fonction, produire des métriques agrégées et traçables sur :

1. **Discours et allocutions** : ce qui est dit factuellement, jugé vrai, faux, mixte ou non vérifiable selon une méthodologie publique.
2. **Programmes et promesses de mandat** : ce qui a été promis, jugé tenu, partiellement tenu, non tenu ou abandonné.
3. **Couverture presse** (post-MVP) : comment les médias relaient, contextualisent, ignorent ou amplifient ces propos.

Le projet est politiquement sensible. La neutralité méthodologique, la transparence totale (code, prompts, scores publics) et la traçabilité jusqu'aux sources sont des piliers de design.

## Documents de cadrage

L'écriture du code ne commence qu'après validation explicite des six documents suivants :

1. [ARCHITECTURE.md](./ARCHITECTURE.md) : choix de stack, topologie déploiement, observabilité, coûts.
2. [DATA_MODEL.md](./DATA_MODEL.md) : schéma Postgres complet, indexes, migrations.
3. [SOURCES.md](./SOURCES.md) : sources de données, accès, licences, fiabilité, priorité.
4. [PROMPTS.md](./PROMPTS.md) : prompts LLM versionnés pour extraction, classification, vérification.
5. [SCORING.md](./SCORING.md) : formule du TruthScore, pondérations, seuils, exemples chiffrés.
6. [RISKS.md](./RISKS.md) : risques juridiques, éthiques, techniques, médiatiques, mitigations.

## Stack cible

- Backend : Python 3.11+ (FastAPI, Pydantic)
- Frontend : Next.js 16 App Router, TypeScript strict, Tailwind, shadcn/ui
- Base de données : Supabase (Postgres 15 + pgvector + Storage + Auth)
- Orchestration workers : Inngest
- LLM : Anthropic Claude (`claude-sonnet-4-6` / `claude-opus-4-7`)
- Embeddings : Voyage AI `voyage-3-large`
- Transcription : OpenAI Whisper API
- Hébergement : Vercel (front), Inngest (workers), Supabase (DB)

## Périmètre MVP

Top 50 figures politiques nationales françaises (Président, gouvernement, leaders de partis, têtes de listes principales). Architecture multi-pays prévue dès le départ.

## Licence

À fixer dans `ARCHITECTURE.md`. Proposition : AGPL-3.0.
