-- politikar 002_sources_claims
-- Ingestion and claims tables : sources, claims, verifications,
-- claim_review_queue, press_coverage (stub).

create table if not exists sources (
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
create index if not exists ix_sources_politician_date on sources (politician_id, occurred_at desc) where deleted_at is null;
create index if not exists ix_sources_type_date on sources (source_type, occurred_at desc) where deleted_at is null;
create unique index if not exists ux_sources_sha256 on sources (raw_text_sha256) where raw_text_sha256 is not null and deleted_at is null;
create index if not exists ix_sources_run on sources (ingested_by_run_id) where ingested_by_run_id is not null;
drop trigger if exists trg_sources_updated_at on sources;
create trigger trg_sources_updated_at before update on sources
  for each row execute function set_updated_at();

create table if not exists claims (
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
create index if not exists ix_claims_politician_type on claims (politician_id, claim_type) where deleted_at is null and duplicate_of_claim_id is null;
create index if not exists ix_claims_source on claims (source_id) where deleted_at is null;
create index if not exists ix_claims_topic_tags on claims using gin (topic_tags) where deleted_at is null;
create index if not exists ix_claims_numeric on claims using gin (numeric_values jsonb_path_ops) where deleted_at is null;
create index if not exists ix_claims_extracted_at on claims (extracted_at desc) where deleted_at is null;
create index if not exists ix_claims_embedding on claims using ivfflat (embedding vector_cosine_ops) with (lists = 100) where deleted_at is null and embedding is not null;
drop trigger if exists trg_claims_updated_at on claims;
create trigger trg_claims_updated_at before update on claims
  for each row execute function set_updated_at();

create table if not exists verifications (
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
create index if not exists ix_verifications_claim_active on verifications (claim_id) where superseded_by_verification_id is null;
create index if not exists ix_verifications_verdict on verifications (verdict) where superseded_by_verification_id is null;
create index if not exists ix_verifications_published on verifications (is_published, created_at desc) where superseded_by_verification_id is null;
create index if not exists ix_verifications_data_sources on verifications using gin (data_sources_used) where superseded_by_verification_id is null;

create table if not exists claim_review_queue (
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
create index if not exists ix_review_queue_status_created on claim_review_queue (status, created_at) where status in ('pending', 'in_review');
drop trigger if exists trg_review_queue_updated_at on claim_review_queue;
create trigger trg_review_queue_updated_at before update on claim_review_queue
  for each row execute function set_updated_at();

create table if not exists press_coverage (
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
create index if not exists ix_press_coverage_outlet on press_coverage (media_outlet) where deleted_at is null;
create index if not exists ix_press_coverage_published on press_coverage (published_at desc) where deleted_at is null;
drop trigger if exists trg_press_coverage_updated_at on press_coverage;
create trigger trg_press_coverage_updated_at before update on press_coverage
  for each row execute function set_updated_at();
