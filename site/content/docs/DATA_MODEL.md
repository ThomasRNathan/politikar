# DATA MODEL

> Schéma Postgres complet pour politikar. Postgres 15+ requis (cible : Supabase Pro, currently Postgres 15.x). Toute évolution doit passer par une migration numérotée et idempotente dans `packages/db/migrations/`.

## 1. Conventions

- **Casse** : `snake_case` partout (tables, colonnes, vues, index).
- **Clés primaires** : `id uuid primary key default gen_random_uuid()` sauf cas exceptionnel justifié.
- **FK** : `<table_singulier>_id` (par exemple `politician_id` référence `politicians.id`).
- **Timestamps** : `timestamptz` toujours, jamais `timestamp` sans tz.
- **Tableaux** : `text[]` pour listes courtes énumérables, `jsonb` pour structures variables.
- **Soft delete** : colonne `deleted_at timestamptz null`. Filtré par défaut dans les vues `_public_*`.
- **Audit** : colonnes `created_at`, `updated_at` sur chaque table mutable, trigger `set_updated_at` auto.
- **Append-only pour `verifications`** : pas d'UPDATE direct, utilisation de `superseded_by_verification_id` pour gérer les révisions.
- **Multi-pays** : champ `country` (ISO 3166-1 alpha-2 lowercase, par exemple `fr`, `de`, `it`) sur `politicians`, `parties`, `functions`, `regions`. Index sur `country` partout.
- **Index naming** : `ix_<table>_<col1>_<col2>` ou `ux_<table>_<col>` pour unique.

## 2. Extensions requises

```sql
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";
create extension if not exists "vector";
```

`vector` provient de pgvector (préinstallé sur Supabase Pro, version >= 0.7).

## 3. Tables référentiel

### 3.1 `regions`

```sql
create table regions (
  id uuid primary key default gen_random_uuid(),
  country text not null check (country ~ '^[a-z]{2}$'),
  level text not null check (level in ('country', 'region', 'department', 'city', 'european')),
  name text not null,
  slug text not null,
  insee_code text null,
  parent_region_id uuid null references regions(id) on delete set null,
  geojson jsonb null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null,
  constraint ux_regions_country_slug unique (country, slug)
);

create index ix_regions_country_level on regions (country, level) where deleted_at is null;
create index ix_regions_parent on regions (parent_region_id) where deleted_at is null;
```

### 3.2 `parties`

```sql
create table parties (
  id uuid primary key default gen_random_uuid(),
  country text not null check (country ~ '^[a-z]{2}$'),
  name text not null,
  short_name text null,
  slug text not null,
  political_family text null check (
    political_family is null or political_family in (
      'far_left', 'left', 'green', 'center_left',
      'center', 'center_right', 'right', 'far_right',
      'regionalist', 'other'
    )
  ),
  founded_at date null,
  dissolved_at date null,
  parent_party_id uuid null references parties(id) on delete set null,
  color_hex text null check (color_hex is null or color_hex ~ '^#[0-9a-fA-F]{6}$'),
  wikidata_id text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null,
  constraint ux_parties_country_slug unique (country, slug)
);

create index ix_parties_country_family on parties (country, political_family) where deleted_at is null;
create index ix_parties_wikidata on parties (wikidata_id) where wikidata_id is not null;
```

### 3.3 `functions`

```sql
create table functions (
  id uuid primary key default gen_random_uuid(),
  country text not null check (country ~ '^[a-z]{2}$'),
  name text not null,
  slug text not null,
  level text not null check (level in (
    'national_executive', 'national_legislative',
    'european', 'regional', 'departmental', 'municipal',
    'party_leadership', 'judicial'
  )),
  scope_region_id uuid null references regions(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null,
  constraint ux_functions_country_slug unique (country, slug)
);

create index ix_functions_country_level on functions (country, level) where deleted_at is null;
```

### 3.4 `politicians`

```sql
create table politicians (
  id uuid primary key default gen_random_uuid(),
  country text not null check (country ~ '^[a-z]{2}$'),
  full_name text not null,
  given_name text null,
  family_name text null,
  slug text not null,
  birth_date date null,
  gender text null check (gender is null or gender in ('male', 'female', 'other', 'unspecified')),
  current_party_id uuid null references parties(id) on delete set null,
  current_function_id uuid null references functions(id) on delete set null,
  current_region_id uuid null references regions(id) on delete set null,
  party_history jsonb not null default '[]'::jsonb,
  function_history jsonb not null default '[]'::jsonb,
  photo_url text null,
  wikidata_id text null,
  official_urls jsonb not null default '{}'::jsonb,
  social_handles jsonb not null default '{}'::jsonb,
  tier text not null default 'P2' check (tier in ('P0', 'P1', 'P2')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null,
  constraint ux_politicians_country_slug unique (country, slug)
);

create index ix_politicians_country_tier on politicians (country, tier) where deleted_at is null;
create index ix_politicians_party on politicians (current_party_id) where deleted_at is null;
create index ix_politicians_function on politicians (current_function_id) where deleted_at is null;
create index ix_politicians_region on politicians (current_region_id) where deleted_at is null;
create index ix_politicians_wikidata on politicians (wikidata_id) where wikidata_id is not null;
create index ix_politicians_name_trgm on politicians using gin (full_name gin_trgm_ops) where deleted_at is null;
```

`tier` permet de prioriser : P0 = top 50 figures nationales (cible MVP, revue humaine obligatoire), P1 = parlementaires actifs, P2 = autres.

### 3.5 `mandates`

```sql
create table mandates (
  id uuid primary key default gen_random_uuid(),
  politician_id uuid not null references politicians(id) on delete cascade,
  function_id uuid not null references functions(id) on delete restrict,
  region_id uuid null references regions(id) on delete set null,
  party_at_election_id uuid null references parties(id) on delete set null,
  start_date date not null,
  end_date date null,
  is_active boolean generated always as (end_date is null or end_date >= current_date) stored,
  election_program_url text null,
  election_program_text text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null,
  check (end_date is null or end_date >= start_date)
);

create index ix_mandates_politician_active on mandates (politician_id, is_active) where deleted_at is null;
create index ix_mandates_function on mandates (function_id) where deleted_at is null;
```

## 4. Tables ingestion et claims

### 4.1 `sources`

```sql
create table sources (
  id uuid primary key default gen_random_uuid(),
  source_type text not null check (source_type in (
    'speech', 'interview', 'tv_debate', 'press_conference',
    'tweet', 'official_statement', 'parliamentary_question',
    'parliamentary_intervention', 'campaign_program',
    'mandate_review', 'op_ed', 'video_clip'
  )),
  politician_id uuid null references politicians(id) on delete set null,
  mandate_id uuid null references mandates(id) on delete set null,
  occurred_at timestamptz not null,
  url text null,
  raw_text text null,
  raw_text_sha256 text null,
  raw_audio_storage_path text null,
  raw_video_url text null,
  transcript text null,
  transcript_quality text null check (transcript_quality is null or transcript_quality in ('low', 'medium', 'high')),
  language text not null default 'fr',
  channel text null,
  source_credibility int not null default 3 check (source_credibility between 1 and 5),
  scraped_at timestamptz not null default now(),
  ingested_by_run_id text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

create index ix_sources_politician_date on sources (politician_id, occurred_at desc) where deleted_at is null;
create index ix_sources_type_date on sources (source_type, occurred_at desc) where deleted_at is null;
create unique index ux_sources_sha256 on sources (raw_text_sha256) where raw_text_sha256 is not null and deleted_at is null;
create index ix_sources_run on sources (ingested_by_run_id) where ingested_by_run_id is not null;
```

`raw_text_sha256` calculé à l'ingestion garantit l'idempotence (même contenu = même row). `ingested_by_run_id` permet de retrouver tout ce qu'un cron a ingéré.

### 4.2 `claims`

```sql
create table claims (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references sources(id) on delete cascade,
  politician_id uuid not null references politicians(id) on delete cascade,
  claim_text text not null,
  claim_normalized text not null,
  claim_type text not null check (claim_type in (
    'factual_assertion', 'promise', 'opinion',
    'rhetorical', 'prediction', 'normative_statement'
  )),
  topic_tags text[] not null default '{}',
  numeric_values jsonb not null default '[]'::jsonb,
  named_entities jsonb not null default '[]'::jsonb,
  embedding vector(1024) null,
  extraction_confidence numeric(3, 2) not null check (extraction_confidence between 0 and 1),
  extracted_at timestamptz not null default now(),
  context_window text null,
  duplicate_of_claim_id uuid null references claims(id) on delete set null,
  prompt_version text not null,
  llm_model text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

create index ix_claims_politician_type on claims (politician_id, claim_type) where deleted_at is null and duplicate_of_claim_id is null;
create index ix_claims_source on claims (source_id) where deleted_at is null;
create index ix_claims_topic_tags on claims using gin (topic_tags) where deleted_at is null;
create index ix_claims_numeric on claims using gin (numeric_values jsonb_path_ops) where deleted_at is null;
create index ix_claims_extracted_at on claims (extracted_at desc) where deleted_at is null;
create index ix_claims_embedding on claims using ivfflat (embedding vector_cosine_ops) with (lists = 100) where deleted_at is null and embedding is not null;
```

`claim_normalized` est la version canonique (ponctuation normalisée, accents standardisés, casse standard) utilisée pour comparaison textuelle exacte. `topic_tags` sont contraints à un vocabulaire défini en application (économie, sécurité, immigration, santé, éducation, etc.).

### 4.3 `verifications`

```sql
create table verifications (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references claims(id) on delete cascade,
  verdict text not null check (verdict in (
    'true', 'mostly_true', 'mixed', 'mostly_false', 'false',
    'unverifiable', 'misleading_context',
    'kept', 'partially_kept', 'broken', 'in_progress', 'abandoned', 'too_early'
  )),
  confidence_score numeric(3, 2) not null check (confidence_score between 0 and 1),
  reasoning text not null,
  evidence jsonb not null default '[]'::jsonb,
  data_sources_used text[] not null default '{}',
  llm_model text not null,
  prompt_version text not null,
  human_reviewed boolean not null default false,
  human_reviewer_id uuid null,
  human_reviewer_note text null,
  superseded_by_verification_id uuid null references verifications(id) on delete set null,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

create index ix_verifications_claim_active on verifications (claim_id) where superseded_by_verification_id is null;
create index ix_verifications_verdict on verifications (verdict) where superseded_by_verification_id is null;
create index ix_verifications_published on verifications (is_published, created_at desc) where superseded_by_verification_id is null;
create index ix_verifications_data_sources on verifications using gin (data_sources_used) where superseded_by_verification_id is null;
```

Append-only : pas de trigger `updated_at`, pas d'UPDATE attendu (sauf `superseded_by_verification_id` qui se renseigne par une UPDATE ciblée). Toute correction crée une nouvelle row qui pointe vers l'ancienne.

`evidence` structure attendue :
```json
[
  {
    "source_url": "https://insee.fr/...",
    "source_label": "INSEE BDM série T_1234",
    "quote": "Taux de chômage 7,1 % au T4 2025",
    "weight": 0.9,
    "kind": "data_api"
  }
]
```

### 4.4 `claim_review_queue`

```sql
create table claim_review_queue (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null unique references claims(id) on delete cascade,
  queued_for_reason text not null check (queued_for_reason in (
    'low_confidence', 'p0_politician', 'sensitive_topic',
    'fact_checker_disagreement', 'manual_flag'
  )),
  status text not null default 'pending' check (status in (
    'pending', 'in_review', 'approved', 'rejected', 'corrected'
  )),
  assigned_to_user_id uuid null,
  reviewer_note text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz null
);

create index ix_review_queue_status_created on claim_review_queue (status, created_at) where status in ('pending', 'in_review');
```

### 4.5 `press_coverage` (stub MVP, scrapers post-MVP)

```sql
create table press_coverage (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references claims(id) on delete cascade,
  media_outlet text not null,
  media_outlet_country text null check (media_outlet_country is null or media_outlet_country ~ '^[a-z]{2}$'),
  article_url text not null,
  article_title text null,
  published_at timestamptz null,
  treatment_type text null check (treatment_type is null or treatment_type in (
    'verbatim_repeat', 'critical_analysis', 'fact_check',
    'ignored', 'amplified', 'contextualized'
  )),
  framing_score numeric(3, 2) null check (framing_score is null or framing_score between -1 and 1),
  reach_estimate bigint null,
  scraped_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null,
  constraint ux_press_coverage_claim_url unique (claim_id, article_url)
);

create index ix_press_coverage_outlet on press_coverage (media_outlet) where deleted_at is null;
create index ix_press_coverage_published on press_coverage (published_at desc) where deleted_at is null;
```

Table créée dès le MVP pour stabiliser le schéma, mais aucun scraper ne la peuplera avant le post-MVP (cf. ARCHITECTURE module presse).

## 5. Tables transverses

### 5.1 `prompt_versions`

```sql
create table prompt_versions (
  id text primary key,
  purpose text not null check (purpose in (
    'claim_extraction', 'claim_classification',
    'speaker_identification', 'verification_cascade',
    'promise_tracking', 'reasoning_generation'
  )),
  version text not null,
  system_prompt text not null,
  tool_schema jsonb null,
  llm_model text not null,
  notes text null,
  created_at timestamptz not null default now(),
  retired_at timestamptz null,
  constraint ux_prompt_versions_purpose_version unique (purpose, version)
);
```

`id` est de la forme `claim_extraction@v1.0.0`. Référencé par `claims.prompt_version` et `verifications.prompt_version`.

### 5.2 `audit_log`

```sql
create table audit_log (
  id bigserial primary key,
  occurred_at timestamptz not null default now(),
  actor_type text not null check (actor_type in ('user', 'service', 'cron', 'inngest')),
  actor_id text null,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  payload jsonb not null default '{}'::jsonb,
  correlation_id text null
);

create index ix_audit_entity on audit_log (entity_type, entity_id, occurred_at desc);
create index ix_audit_correlation on audit_log (correlation_id) where correlation_id is not null;
create index ix_audit_occurred_at on audit_log (occurred_at desc);
```

Pas de FK : la table doit survivre à la suppression d'entités.

## 6. Vues matérialisées d'agrégations

### 6.1 `politician_stats`

```sql
create materialized view politician_stats as
with verified as (
  select
    c.politician_id,
    v.verdict,
    v.confidence_score,
    c.claim_type,
    c.created_at as claim_created_at
  from claims c
  join verifications v on v.claim_id = c.id
    and v.superseded_by_verification_id is null
    and v.is_published = true
  where c.deleted_at is null
    and c.duplicate_of_claim_id is null
)
select
  politician_id,
  count(*) filter (where claim_type = 'factual_assertion') as factual_claims_count,
  count(*) filter (where claim_type = 'factual_assertion' and verdict = 'true') as true_count,
  count(*) filter (where claim_type = 'factual_assertion' and verdict = 'mostly_true') as mostly_true_count,
  count(*) filter (where claim_type = 'factual_assertion' and verdict = 'mixed') as mixed_count,
  count(*) filter (where claim_type = 'factual_assertion' and verdict = 'mostly_false') as mostly_false_count,
  count(*) filter (where claim_type = 'factual_assertion' and verdict = 'false') as false_count,
  count(*) filter (where claim_type = 'factual_assertion' and verdict = 'unverifiable') as unverifiable_count,
  count(*) filter (where claim_type = 'factual_assertion' and verdict = 'misleading_context') as misleading_count,
  count(*) filter (where claim_type = 'promise') as promises_made,
  count(*) filter (where claim_type = 'promise' and verdict = 'kept') as promises_kept,
  count(*) filter (where claim_type = 'promise' and verdict = 'partially_kept') as promises_partially_kept,
  count(*) filter (where claim_type = 'promise' and verdict = 'broken') as promises_broken,
  avg(confidence_score) filter (where claim_type = 'factual_assertion') as avg_confidence_factual,
  now() as computed_at
from verified
group by politician_id;

create unique index ux_politician_stats_id on politician_stats (politician_id);
create index ix_politician_stats_factual_count on politician_stats (factual_claims_count desc);
```

### 6.2 `party_stats`, `function_stats`, `region_stats`

Mêmes patterns, agrégations par `parties.id`, `functions.id`, `regions.id` via les FK courantes des politicians. Définitions complètes en migration `004_aggregations.sql`.

### 6.3 Refresh

```sql
create or replace function refresh_all_stats() returns void language plpgsql as $$
begin
  refresh materialized view concurrently politician_stats;
  refresh materialized view concurrently party_stats;
  refresh materialized view concurrently function_stats;
  refresh materialized view concurrently region_stats;
end;
$$;
```

Appelée par un cron Inngest horaire. Les calculs de `truthfulness_score` (cf. SCORING.md) ne sont pas dans la vue matérialisée mais dans une table `politician_truth_scores` calculée au même moment côté Python (formules complexes, bootstrap CI). Schéma :

```sql
create table politician_truth_scores (
  politician_id uuid primary key references politicians(id) on delete cascade,
  truth_score numeric(5, 2) null,
  factual_score numeric(5, 2) null,
  promise_score numeric(5, 2) null,
  transparency_score numeric(5, 2) null,
  ci_low numeric(5, 2) null,
  ci_high numeric(5, 2) null,
  topic_breakdown jsonb not null default '{}'::jsonb,
  is_significant boolean not null default false,
  computed_at timestamptz not null default now()
);

create index ix_truth_scores_significant_score on politician_truth_scores (is_significant, truth_score desc);
```

## 7. Vues publiques (`_public_*`)

Vues filtrées exposées en `SELECT` à `anon` pour la consommation par l'API publique Next.js.

```sql
create view _public_politicians as
select
  id, country, full_name, slug, given_name, family_name,
  birth_date, gender, current_party_id, current_function_id,
  current_region_id, photo_url, wikidata_id, tier
from politicians
where deleted_at is null;

create view _public_claims as
select
  c.id, c.politician_id, c.source_id, c.claim_text, c.claim_type,
  c.topic_tags, c.numeric_values, c.extracted_at, c.created_at
from claims c
join verifications v on v.claim_id = c.id
  and v.superseded_by_verification_id is null
  and v.is_published = true
where c.deleted_at is null
  and c.duplicate_of_claim_id is null;

create view _public_verifications as
select
  v.id, v.claim_id, v.verdict, v.confidence_score,
  v.reasoning, v.evidence, v.data_sources_used,
  v.human_reviewed, v.created_at
from verifications v
where v.superseded_by_verification_id is null
  and v.is_published = true;
```

Ces vues sont les seuls endpoints SELECT autorisés à `anon` via RLS. Les tables brutes restent accessibles uniquement au service role.

## 8. RLS policies

```sql
alter table politicians enable row level security;
alter table parties enable row level security;
alter table functions enable row level security;
alter table regions enable row level security;
alter table mandates enable row level security;
alter table sources enable row level security;
alter table claims enable row level security;
alter table verifications enable row level security;
alter table press_coverage enable row level security;
alter table claim_review_queue enable row level security;
alter table prompt_versions enable row level security;
alter table audit_log enable row level security;
alter table politician_truth_scores enable row level security;

create policy svc_full_access on politicians
  for all to service_role using (true) with check (true);
-- répété pour chaque table

create policy admin_full_access on politicians
  for all to authenticated
  using (auth.jwt() ->> 'app_role' = 'admin')
  with check (auth.jwt() ->> 'app_role' = 'admin');
-- répété
```

`anon` n'a aucune policy directe sur les tables. Lecture publique = uniquement via les vues `_public_*` (les vues n'ont pas RLS, c'est leur définition qui filtre).

## 9. Triggers utilitaires

```sql
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_politicians_updated_at before update on politicians
  for each row execute function set_updated_at();
-- répété pour toutes les tables avec updated_at
```

## 10. Migrations

Numérotation `NNN_description.sql`. Idempotentes (`if not exists`). Règle : aucune migration ne supprime ni ne renomme de colonne sans migration suivante (`NNN_drop_*`) après backfill validé.

Plan initial :

| Migration | Contenu |
|---|---|
| `001_init.sql` | Extensions, fonctions utilitaires, tables référentiel (regions, parties, functions, politicians, mandates) |
| `002_sources_claims.sql` | Tables `sources`, `claims`, `verifications`, `claim_review_queue`, `press_coverage` |
| `003_transverse.sql` | `prompt_versions`, `audit_log`, `politician_truth_scores` |
| `004_aggregations.sql` | Vues matérialisées `*_stats`, fonction `refresh_all_stats`, indexes uniques |
| `005_public_views.sql` | Vues `_public_*` |
| `006_rls.sql` | RLS policies sur toutes les tables |
| `007_seed_meta.sql` | Seed minimal des `prompt_versions` initiaux et `functions` standards France |

Outillage : Supabase CLI (`supabase migration new`, `supabase db reset` en local Postgres 15 dans Docker).

## 11. Tests d'invariants

Suite `pytest` côté Python qui frappe une DB Supabase locale et vérifie :

1. Insertion d'un `claim` sans `verifications` n'apparaît pas dans `_public_claims`.
2. `superseded_by_verification_id` rend la verification précédente invisible des vues `_public_verifications`.
3. `duplicate_of_claim_id` exclut le claim des `politician_stats`.
4. Soft delete d'un `politician` retire ses claims des vues publiques.
5. RLS bloque toute lecture `anon` sur tables brutes (test via client Supabase anon key).
6. `refresh_all_stats()` est idempotent (deux appels successifs donnent le même état).
7. Insertion d'un même `raw_text_sha256` deux fois lève l'unique constraint.

## 12. Estimation volumétrique

| Entité | Volume MVP (an 1) | Volume cible (an 3) |
|---|---|---|
| `politicians` | 50 | 2 000 |
| `parties` | 30 | 100 |
| `regions` | 200 | 5 000 |
| `mandates` | 100 | 5 000 |
| `sources` | 5 000 | 200 000 |
| `claims` | 20 000 | 1 000 000 |
| `verifications` | 25 000 | 1 500 000 |
| `audit_log` | 100 000 | 10 000 000 |

L'index `IVFFlat lists=100` reste pertinent jusqu'à ~100k claims ; au-delà, basculer en `HNSW` (mention en RISKS technique).

## 13. Questions ouvertes pour relecture

1. **Vocabulaire `topic_tags`** : faut-il une table `topics` séparée pour normaliser, ou rester en `text[]` et appliquer un Pydantic enum côté application ? Position actuelle : enum côté app, plus simple, on migre si besoin.
2. **Gestion des élections** : prévoir une table `elections` ou rester implicite via `mandates` ? Position : différé en post-MVP.
3. **Versioning des entités politiciens (changement de nom, transition)** : table `politician_aliases` à prévoir ? Probablement utile dès Phase 1.
4. **Politique géolocalisation des claims** : si un politicien parle au Sénat vs sur sa circonscription, on capture où dans `sources.channel`. Suffisant ?
5. **Index `pg_trgm` sur `claim_normalized`** : utile pour recherche texte côté admin. À ajouter en Phase 3.
