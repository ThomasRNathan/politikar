-- politikar 003_transverse
-- Transverse tables : prompt_versions, audit_log, politician_truth_scores.

create table if not exists prompt_versions (
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

create table if not exists audit_log (
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
create index if not exists ix_audit_entity on audit_log (entity_type, entity_id, occurred_at desc);
create index if not exists ix_audit_correlation on audit_log (correlation_id) where correlation_id is not null;
create index if not exists ix_audit_occurred_at on audit_log (occurred_at desc);

create table if not exists politician_truth_scores (
  politician_id uuid primary key references politicians(id) on delete cascade,
  truth_score numeric(5, 2) null,
  factual_score numeric(5, 2) null,
  promise_score numeric(5, 2) null,
  transparency_score numeric(5, 2) null,
  ci_low numeric(5, 2) null,
  ci_high numeric(5, 2) null,
  topic_breakdown jsonb not null default '{}'::jsonb,
  is_significant boolean not null default false,
  scoring_version text not null default 'v1.0.0',
  computed_at timestamptz not null default now()
);
create index if not exists ix_truth_scores_significant_score on politician_truth_scores (is_significant, truth_score desc);
