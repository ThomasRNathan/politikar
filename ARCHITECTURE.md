# ARCHITECTURE

> Document de cadrage v1. Verrouille la stack, la topologie, les responsabilités, l'observabilité, la sécurité et le coût cible. Tout choix non documenté ici doit être tranché avant Phase 0 code.

## 1. Principes de design

1. **Transparence par défaut** : code, prompts, scores, méthodologie publics. Tout verdict doit être traçable jusqu'à ses sources brutes.
2. **Reproductibilité** : versions de prompts (`prompt_version_id`) et empreintes des sources (`raw_text_sha256`) stockées avec chaque verdict pour permettre de rejouer un fact-check à l'identique.
3. **Multi-pays dès le départ** : `country` sur toutes les entités politiques. France au MVP, schéma déjà compatible UE.
4. **Read public, write privé** : l'API publique est strictement read-only. L'ingestion et l'admin passent par une API séparée et authentifiée.
5. **LLM assistant, pas juge** : Claude propose un verdict structuré. Pour les claims sensibles ou de faible confiance, revue humaine obligatoire avant publication.
6. **Coût bornable** : pas de boucle d'appels LLM non contrôlée. Budget mensuel cible <120 $ au MVP, plafond dur 200 $.

## 2. Diagramme

```
+-----------------------------------------------------------------+
|                        SOURCES EXTERNES                         |
| Assemblée nationale | Sénat | Élysée | Matignon | NosDéputés    |
| Wikidata | INSEE | Eurostat | data.gouv.fr | Fact-checkers      |
| YouTube (post-MVP P1)                                           |
+-------------------------------+---------------------------------+
                                |
                       fetch / scrape / API
                                v
+-----------------------------------------------------------------+
|                INGESTION (workers Inngest Python)               |
|  Connecteurs typés > Normalisation > Stockage `sources` brut    |
+-------------------------------+---------------------------------+
                                |
                                v
+-----------------------------------------------------------------+
|                  TRANSCRIPTION (audio/vidéo)                    |
|  OpenAI Whisper API (whisper-1) > diarization si plateau        |
+-------------------------------+---------------------------------+
                                |
                                v
+-----------------------------------------------------------------+
|              EXTRACTION DE CLAIMS (Claude Sonnet 4.6)           |
|  Tool use JSON strict > claims typés + entités + valeurs        |
+-------------------------------+---------------------------------+
                                |
                                v
+-----------------------------------------------------------------+
|              EMBEDDINGS + DÉDUPLICATION (Voyage 3-L)            |
|  vector(1024) > pgvector IVFFlat > similarity > 0.92 = dup      |
+-------------------------------+---------------------------------+
                                |
                                v
+-----------------------------------------------------------------+
|       CASCADE DE VÉRIFICATION (orchestrée par Inngest)          |
|  1. Lookup base interne                                         |
|  2. Lookup fact-checkers (AFP Factuel, CheckNews, Décodeurs)    |
|  3. Lookup data API (INSEE, Eurostat, data.gouv.fr)             |
|  4. Raisonnement Claude (Sonnet 4.6 > Opus 4.7 si confiance bas)|
|  5. File de revue humaine si claim sensible                     |
+-------------------------------+---------------------------------+
                                |
                                v
+-----------------------------------------------------------------+
|               STOCKAGE (Supabase Postgres + pgvector)           |
|  politicians, parties, sources, claims, verifications, etc.     |
+-------------------------------+---------------------------------+
                                |
              +-----------------+------------------+
              |                                    |
              v                                    v
+-----------------------------+   +-----------------------------+
|    AGRÉGATIONS (vues mat.)  |   |   API ADMIN (FastAPI)       |
|    TruthScore par politique |   |   ingestion, revue, queue   |
|    refresh hourly via cron  |   |   auth Supabase JWT         |
+--------------+--------------+   +--------------+--------------+
               |                                 ^
               v                                 |
+-----------------------------+                  |
|  API PUBLIQUE (Next.js RH)  |                  |
|  read-only, cachée 60s ISR  |                  |
+--------------+--------------+                  |
               |                                 |
               v                                 |
+-----------------------------+        +-------------------------+
|   FRONTEND (Next.js 16 App  |        |  Admin Web (Next.js)    |
|   Router, RSC, Tailwind)    |        |  protégé Supabase Auth  |
+-----------------------------+        +-------------------------+
```

## 3. Composants

### 3.1 Frontend public : Next.js 16 App Router

**Rôle** : pages publiques (carte interactive France, profils politiques, partis, fonctions, régions, claims, méthodologie).

**Choix techniques** :
- App Router avec React Server Components (RSC) par défaut, Client Components uniquement pour les visus interactives D3.
- ISR (`revalidate: 60`) sur les pages politique/parti/fonction/région : compromis fraîcheur / coût acceptable.
- Tailwind CSS + shadcn/ui pour la base de composants. Typo : Inter (sans-serif) + une serif (Source Serif 4 ou Tinos) pour les titres et chiffres.
- D3.js pour la carto France et les visus custom complexes. Recharts pour les charts standards.
- Mode sombre via Tailwind class strategy.

**Alternatives écartées** :
- *SvelteKit ou Astro* : très bon pour un site statique, mais perd la cohésion avec Vercel + l'écosystème React de shadcn et la maturité D3 React.
- *Remix* : intéressant mais moins de gravité communautaire pour le côté SaaS et Vercel-native.

### 3.2 API publique : Next.js Route Handlers

**Rôle** : exposer les données agrégées (politiciens, partis, scores, claims publiés) en read-only, avec cache fort.

**Choix techniques** :
- Route Handlers (App Router) en `app/api/v1/*/route.ts`, runtime Node.js (Fluid Compute).
- Cache layer : Vercel Data Cache (revalidate: 60), invalidation par tag à la fin des refresh d'agrégations.
- OpenAPI 3.1 spec maintenue à la main dans `apps/web/openapi.yaml` jusqu'à automatisation.
- Pas d'écriture publique. Toute requête `POST/PUT/DELETE` retourne 405.

**Alternatives écartées** :
- *Tout coller dans FastAPI* : plus simple côté Python, mais sépare déploiement et coût (Vercel Edge cache vs FastAPI sur Inngest/Modal). Mauvaise expérience pour une lecture publique.
- *Hono ou tRPC* : tRPC casse la lisibilité publique de l'API ; Hono ajoute une dépendance pour peu de gain ici.

### 3.3 API interne (admin et ingestion) : FastAPI

**Rôle** : endpoints d'administration (revue humaine de claims, gestion référentiel politicians/parties), trigger de jobs ingestion, exposition des outils LLM (tool use callbacks pour la cascade de vérification).

**Choix techniques** :
- FastAPI 0.115+ avec Pydantic v2, validation stricte des inputs.
- Auth via Supabase JWT (admin role required), middleware `verify_supabase_jwt` qui décode et vérifie l'aud.
- Hébergé sur Modal (web endpoint) ou Railway. Décision arrêtée : **Railway pour le MVP** (always-on, simple, prévisible). Migration possible vers Modal si besoin GPU.
- OpenAPI auto-généré, exposé sur `/docs` en interne.
- Connexion DB via `asyncpg` direct (pas de SQLAlchemy au MVP, pour rester proche du SQL).

**Alternatives écartées** :
- *Litestar* : plus rapide mais maturité moindre.
- *Tout en TS / Hono* : on perd l'écosystème ML Python pour rien.

### 3.4 Base de données : Supabase (Postgres 15)

**Rôle** : single source of truth. Stocke référentiel, sources brutes, transcripts, claims, verifications, audit, vues matérialisées d'agrégations.

**Choix techniques** :
- Postgres 15 avec extensions : `pgvector` (embeddings), `pg_trgm` (recherche fuzzy nom politicien), `pgcrypto` (sha256 des sources), `uuid-ossp`.
- Supabase Storage pour fichiers volumineux : audio brut, captures vidéo, transcripts longs (>1 Mo).
- Supabase Auth pour le panel admin (Google OAuth + magic link).
- RLS activé sur toutes les tables. Policy par défaut : `SELECT` public sur `_public_*` views, écriture interdite. Tables brutes accessibles uniquement via service role (utilisé par FastAPI et workers).
- Plan : Pro (25 $/mo), 8 Go DB inclus, suffisant jusqu'à plusieurs millions de claims.

**Alternatives écartées** :
- *Neon* : excellent fork Postgres serverless, mais perd Storage et Auth intégrés. Aurait nécessité Clerk + Cloudflare R2 séparés.
- *PlanetScale* : MySQL, perd pgvector.
- *Self-hosted Postgres sur Railway* : moins cher en théorie mais plus de plomberie (backups, monitoring, RLS à recoder).

### 3.5 Orchestration des workers : Inngest

**Rôle** : exécution durable, event-driven, des jobs de scraping, transcription, extraction, vérification, agrégation. Crons hebdomadaires et journaliers.

**Choix techniques** :
- Inngest Python SDK (`inngest`). Workers Python servis via une fonction `serve()` exposée par FastAPI sur Railway, ou directement sur Inngest Cloud.
- Patterns clés :
  - `inngest.cron("0 4 * * *", ...)` pour les ingestions journalières (Élysée, Matignon, AN).
  - `inngest.cron("0 5 * * 1", ...)` pour l'ingestion hebdo (émissions YouTube, agrégations refresh).
  - Fan-out via `step.send_event` pour traiter une liste de claims en parallèle bornée.
  - Fan-in via `step.wait_for_event` pour la cascade de vérification.
  - `step.run` autour de chaque appel externe (LLM, scrape) pour bénéficier des retries automatiques et de l'idempotence.
- Free tier Inngest : 50k step runs/mo, suffisant au MVP (estimation : ~20k/mo).

**Alternatives écartées** :
- *Vercel Cron + Functions* : insuffisant. Pas de durable execution multi-step, timeout fonctions, pas de retries observables.
- *Trigger.dev* : très proche fonctionnellement, plus jeune, moins d'observabilité native.
- *Temporal self-hosted* : surdimensionné pour le MVP.
- *APScheduler dans une VM Railway always-on* : marche mais pas durable, perd l'historique en cas de crash, pas d'observabilité.

### 3.6 LLM : Anthropic Claude

**Rôle** : extraction de claims, classification, identification d'orateur, raisonnement de vérification, génération de raisonnements structurés.

**Choix techniques** :
- Modèle par défaut : `claude-sonnet-4-6` pour extraction et classification (volume).
- Modèle d'escalade : `claude-opus-4-7` pour verdict final si confiance basse, claim politiquement sensible (politicien P0 + sujet sensible) ou désaccord entre fact-checkers.
- Tool use JSON strict (input schemas Pydantic compilés en JSON Schema) pour fiabiliser parsing, retry sur échec.
- Prompt caching Anthropic : 2 breakpoints, 1 sur le system prompt (référentiel + règles méthodo, ~3000 tokens stables), 1 sur le payload de contexte source (transcript long).
- Budget : ~50 $/mo MVP estimé, 200 $/mo plafond strict via alerts Anthropic Console.
- Pas de Web Search au MVP : la cascade de vérification s'appuie strictement sur les sources structurées et fact-checkers déjà ingérés, ou retombe en `unverifiable`.

**Alternatives écartées** :
- *OpenAI GPT-4o ou GPT-5* : qualité comparable, mais on capitalise sur la cohérence avec le tooling Anthropic et le prompt caching plus agressif.
- *Mistral Large* : argument souveraineté, mais qualité fact-checking jugée inférieure sur des évaluations internes Anthropic publiques. À réévaluer pour un éventuel pivot.
- *Multi-LLM avec fallback* : complexité forte (prompts différents, cache différent, parsing différent) pour un gain limité. Reporté.

### 3.7 Embeddings : Voyage AI `voyage-3-large`

**Rôle** : indexer les claims pour détection de duplicats sémantiques et recherche de claims similaires déjà vérifiés.

**Choix techniques** :
- Modèle `voyage-3-large`, 1024 dim, normalisation L2 côté client.
- Stockage dans `claims.embedding vector(1024)` (pgvector).
- Index : `IVFFlat` à 100 listes au démarrage (suffit jusqu'à ~100k claims), basculer en HNSW au-delà.
- Distance : cosine. Seuil dédup : 0,92 sur cosine similarity (à calibrer en Phase 3 sur jeu de test).
- Coût : 0,18 $/M tokens input. Estimation MVP ~5 $/mo.

**Alternatives écartées** :
- *OpenAI `text-embedding-3-large`* : qualité multilingue inférieure sur français politique d'après benchmarks publics (MTEB). Conservé comme fallback.
- *Mistral Embed* : argument souveraineté FR séduisant, qualité à valider sur claims politiques. À benchmarker post-MVP.
- *Cohere `embed-multilingual-v3`* : excellent multilingue mais 0,12 $/M, pas de gain face à Voyage pour notre cas.

### 3.8 Transcription : OpenAI Whisper API

**Rôle** : transcrire les émissions politiques YouTube et tout audio collecté en texte attribué.

**Choix techniques** :
- Endpoint `audio/transcriptions` modèle `whisper-1` (large-v3 sous le capot).
- Pas de diarization native côté Whisper API. Stratégie hybride :
  - Cas A interview 1-on-1 (Inter 7/9, Europe 1 matin) : single-speaker assumption, l'orateur attendu est le politicien programmé. Vérification heuristique sur le métadata YouTube.
  - Cas B plateau multi-invités (LCP, BFM) : passage par Replicate `whisperx-diarize` (~0,01 $/min) qui combine Whisper + pyannote. Reporté en P1.
- Coût : 0,006 $/min, ~10 h/sem MVP = ~15 $/mo.
- Audio stocké en Supabase Storage (`raw/audio/<source_id>.mp3`), supprimé après 90 jours, transcript conservé indéfiniment.

**Alternatives écartées** :
- *Self-host Whisper sur Modal GPU* : devient économique au-delà de 50h/sem ; pas notre volume MVP.
- *Replicate dès le MVP* : marche mais pour interviews 1-on-1 c'est sur-dimensionné.
- *AssemblyAI* : excellente diarization native française, mais 0,015 $/min vs 0,006, et lock-in plus fort.

## 4. Flux de données détaillé

### 4.1 Cycle d'ingestion journalier (cron 04:00 UTC)

1. Inngest cron déclenche `ingest/daily.requested`.
2. Fan-out par source P0 : `ingest/source.requested {source_type, since_ts}`.
3. Chaque worker source :
   1. Pull (API ou scrape) depuis `since_ts = max(sources.scraped_at WHERE source_type=X)`.
   2. Normalise en `raw_text` propre (HTML > markdown via `markdownify`, captions > paragraphs).
   3. Calcule `sha256(raw_text)`, skip si déjà présent.
   4. Identifie `politician_id` via matching nom + fonction + parti (cf. PROMPTS prompt 3).
   5. Insert `sources` row, retourne `source_id`.
   6. Émet `claims/extraction.requested {source_id}`.
4. Worker extraction : appelle Claude Sonnet 4.6, récupère claims structurés, calcule embeddings Voyage.
5. Pour chaque claim : check dédup via pgvector (cosine > 0,92). Si dup, lien `duplicate_of_claim_id` et stop. Sinon, insert et émet `verifications/cascade.requested {claim_id}`.
6. Worker cascade exécute les 5 étapes (cf. PROMPTS prompt 4) avec `step.run` autour de chaque.
7. À la fin : émet `aggregations/refresh.requested {politician_ids: [...]}`.

### 4.2 Refresh agrégations (cron horaire)

1. `REFRESH MATERIALIZED VIEW CONCURRENTLY politician_stats;` (et autres `_stats`).
2. Invalidate Vercel cache tags `politician:<id>`, `party:<id>`, `function:<id>`, `region:<id>`.

### 4.3 Cycle hebdomadaire (cron lundi 05:00 UTC)

1. Sélection des émissions de la semaine via une liste curated (`youtube_channels` + `youtube_playlists` table de config).
2. Téléchargement audio via `yt-dlp` dans Supabase Storage.
3. Transcription Whisper API.
4. Extraction claims + cascade comme au quotidien.

### 4.4 Cycle de revue humaine

1. Tout claim avec `confidence_score < 0.7` ou `politician.tier == 'P0'` est mis dans `claim_review_queue` avec `status = 'pending_review'`.
2. Le verdict n'est pas affiché publiquement tant que statut `pending_review`. Sur `politicians_stats`, ces claims sont exclus du calcul.
3. Reviewer humain via le panel admin marque `approved`, `rejected`, ou `corrected_with_override`.

## 5. Topologie de déploiement

| Service | Hébergeur | Rôle | URL prévue |
|---|---|---|---|
| Frontend public + API read-only | Vercel | Pages, API publique | `politkar.fr` |
| Frontend admin | Vercel (sous-domaine) | Panel revue + référentiel | `admin.politkar.fr` |
| API interne (FastAPI) | Railway | Admin endpoints, callbacks | `api.politkar.fr` (proxied via Cloudflare) |
| Workers Python | Inngest Cloud | Ingestion, extraction, cascade | n/a |
| Postgres + Storage + Auth | Supabase Pro | DB single source of truth | n/a |
| GPU Whisper (post-MVP) | Modal | Self-host transcription | n/a |
| Erreurs | Sentry (free tier) | Observabilité erreurs | n/a |
| Analytics | Plausible (selfhost ou cloud 9 $) | Visites anonymes | n/a |

Toutes les URLs publiques passent par Cloudflare en proxy pour bénéficier d'un cache CDN supplémentaire et d'un WAF basique anti-DDoS.

## 6. Layout repository (monorepo)

```
politkar/
  apps/
    web/                    # Next.js 16 (front public + admin + API publique)
      app/
        (public)/           # routes publiques
        admin/              # routes admin protégées
        api/v1/             # API publique read-only
      components/
      lib/
      openapi.yaml
    api/                    # FastAPI (admin + ingestion API)
      politkar_api/
        main.py
        routers/
        schemas/
        services/
      pyproject.toml
    workers/                # Inngest functions Python
      politkar_workers/
        functions/
        clients/            # wrappers Anthropic, Voyage, OpenAI, Supabase
        prompts/            # prompt versions as code
      pyproject.toml
  packages/
    db/                     # SQL migrations + types générés
      migrations/
      schema.sql
      generated/
        types.py            # via supabase gen types
        types.ts
  scripts/
    seed-politicians.py
    test-prompts.py
  docs/                     # documentation publique additionnelle
  ARCHITECTURE.md
  DATA_MODEL.md
  SOURCES.md
  PROMPTS.md
  SCORING.md
  RISKS.md
  README.md
  .github/workflows/
    ci.yaml
    deploy-web.yaml
  pyproject.toml            # workspace config
  package.json              # workspace config
  pnpm-workspace.yaml
```

Gestion des deps : `pnpm` côté JS (workspaces), `uv` côté Python (workspaces via `uv.workspace`). Pas de Turborepo au MVP, `pnpm -r` suffit.

## 7. Sécurité

### 7.1 Secrets

- Stockés dans Vercel (front), Inngest Cloud (workers), Railway (API), Supabase (DB) selon le service consommateur.
- Aucun `.env` committé. `.env.example` à la racine de chaque app.
- Rotation prévue tous les 6 mois pour Anthropic, Voyage, OpenAI keys.

### 7.2 RLS Postgres

- Toutes les tables ont RLS activé.
- Service role utilisé uniquement par FastAPI et workers (jamais par le front).
- Policies de lecture : `_public_politicians`, `_public_claims`, `_public_verifications` (vues filtrées) accessibles `anon`. Tables brutes interdites en lecture anon.
- Policies admin : sur la base de `auth.jwt() ->> 'role' = 'admin'`.

### 7.3 Validation des inputs

- Pydantic v2 sur FastAPI, Zod sur Next.js. Refus systématique des unknown fields.
- Échappement SQL via paramètres préparés uniquement (`asyncpg`, `supabase-js`). Pas de string concat.
- Sanitization des HTML scrappé avant insertion (bleach côté Python, DOMPurify en lecture front si on rend du HTML).

### 7.4 Anti-DDoS et rate-limit

- Cloudflare WAF en front, règles standards bot mitigation.
- Rate limit applicatif sur l'API publique : 60 req/min/IP via Upstash Redis (free tier) + middleware Next.js.
- Bot detection optionnelle via Vercel BotID si abus.

### 7.5 Politique de divulgation

- `SECURITY.md` à la racine avec contact (`security@politkar.fr` à provisionner) et SLA 72h.
- Bug bounty informel : remerciements publics sur la page À propos.

## 8. Observabilité

- **Erreurs** : Sentry (free tier, 5k events/mo). Intégré côté Next.js, FastAPI, et Inngest.
- **Logs structurés JSON** : `loguru` côté Python, `pino` côté TS. Champ `correlation_id` propagé sur tout le pipeline (généré au cron, transmis dans les events Inngest).
- **Métriques pipeline** : tableau de bord interne Next.js admin qui requête `verifications_per_day`, `claims_extracted_per_day`, `pipeline_failures`, `LLM_cost_usd_per_day`.
- **Analytics public** : Plausible self-host ou cloud (9 $/mo). Visites anonymisées, pas de cookie, pas de tracking individuel.
- **Health checks** : endpoint `/api/v1/health` qui vérifie DB + Redis + Anthropic ping. Monitoré par UptimeRobot free tier.

## 9. Politique de rétention

- `sources.raw_text` : conservé indéfiniment (faible volume).
- `sources.raw_audio` (Supabase Storage) : conservé 90 jours puis supprimé. Transcript conservé indéfiniment.
- `sources.raw_video_url` : on stocke le lien YouTube, jamais la vidéo elle-même.
- `verifications` historiques : conservés indéfiniment, table append-only avec `superseded_by` pour révisions.
- `audit_log` : conservé indéfiniment.
- Données admin (logs auth) : 12 mois.

## 10. Coût mensuel cible

| Poste | Estimation MVP | Plafond dur |
|---|---|---|
| Supabase Pro | 25 $ | 25 $ |
| Vercel Pro (1 dev) | 20 $ | 20 $ |
| Railway hobby (FastAPI 24/7) | 5 $ | 10 $ |
| Inngest free tier | 0 $ | 20 $ si dépassement |
| Anthropic API | 50 $ | 100 $ |
| Voyage AI | 5 $ | 15 $ |
| OpenAI Whisper | 15 $ | 30 $ |
| Sentry free | 0 $ | 26 $ team |
| Plausible cloud | 9 $ | 9 $ |
| Cloudflare free | 0 $ | 0 $ |
| Domaines | 1 $ amorti | 1 $ |
| **Total** | **~130 $** | **~256 $** |

Plafond dur sous 200 $ tenu si on freeze Sentry team et qu'on optimise le volume LLM. Budget dépassé déclenche pause automatique des crons via une feature flag `ingestion_enabled`.

## 11. Licence

**Proposition : AGPL-3.0**.

Justification :
- Cohérence avec un projet politiquement sensible et un objectif de transparence radicale : empêche un acteur privé de reprendre le code, l'enrichir et le servir en SaaS sans rendre les modifications publiques.
- Précédent : projets civic tech français comme `nosdéputés.fr` (Regards Citoyens) sont en AGPL.
- Compatible avec une infra serveurs ouverte et auditée.

Alternative considérée : MIT. Plus permissive, accélère l'adoption, mais ouvre la porte au fork propriétaire. Risque jugé trop élevé pour un projet où l'intégrité méthodologique est centrale.

À valider explicitement par le porteur du projet avant le premier commit public.

## 12. CI/CD

- GitHub Actions, deux workflows :
  - `ci.yaml` : sur PR, exécute lint Python (`ruff`), lint TS (`biome` ou `eslint`), `mypy`, `pytest`, `pnpm test`.
  - `deploy-web.yaml` : push sur main déploie le front via Vercel CLI (preview) ou Vercel Git Integration (auto).
- Coverage cible : 70 % côté Python (workers + API), 60 % côté TS (composants critiques + helpers).
- Pas de tests E2E avant Phase 8.

## 13. Questions ouvertes pour relecture

1. **Licence** : valider AGPL-3.0 ou trancher pour MIT.
2. **Visibilité GitHub** : repo `private` au démarrage, basculer `public` à quel jalon (validation des 6 docs ? Phase 0 ? lancement officiel ?).
3. **Domaine** : `politkar.fr` proposé. Vérifier disponibilité et préférences de nom de domaine.
4. **Email contact** : `security@politkar.fr` et `contact@politkar.fr` à mettre en place via un fournisseur léger (Fastmail, ProtonMail).
5. **Hébergeur API interne** : Railway proposé. Modal valable si on veut converger vers une infra GPU à terme. À trancher.
6. **Compte Anthropic, OpenAI, Voyage** : compte personnel ou structure dédiée (asso loi 1901 ?). Impact RGPD et facturation.
