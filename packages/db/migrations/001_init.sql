-- politikar 001_init
-- Extensions, utility functions, referential tables (regions, parties,
-- functions, politicians, mandates).
-- Idempotent. Safe to re-run on a clean Supabase Pro Postgres 15+.

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";
create extension if not exists "vector";

-- updated_at trigger helper
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- regions
create table if not exists regions (
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
create index if not exists ix_regions_country_level on regions (country, level) where deleted_at is null;
create index if not exists ix_regions_parent on regions (parent_region_id) where deleted_at is null;
drop trigger if exists trg_regions_updated_at on regions;
create trigger trg_regions_updated_at before update on regions
  for each row execute function set_updated_at();

-- parties
create table if not exists parties (
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
  logo_url text null,
  wikidata_id text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null,
  constraint ux_parties_country_slug unique (country, slug)
);
create index if not exists ix_parties_country_family on parties (country, political_family) where deleted_at is null;
create index if not exists ix_parties_wikidata on parties (wikidata_id) where wikidata_id is not null;
drop trigger if exists trg_parties_updated_at on parties;
create trigger trg_parties_updated_at before update on parties
  for each row execute function set_updated_at();

-- functions
create table if not exists functions (
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
create index if not exists ix_functions_country_level on functions (country, level) where deleted_at is null;
drop trigger if exists trg_functions_updated_at on functions;
create trigger trg_functions_updated_at before update on functions
  for each row execute function set_updated_at();

-- politicians
create table if not exists politicians (
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
create index if not exists ix_politicians_country_tier on politicians (country, tier) where deleted_at is null;
create index if not exists ix_politicians_party on politicians (current_party_id) where deleted_at is null;
create index if not exists ix_politicians_function on politicians (current_function_id) where deleted_at is null;
create index if not exists ix_politicians_region on politicians (current_region_id) where deleted_at is null;
create index if not exists ix_politicians_wikidata on politicians (wikidata_id) where wikidata_id is not null;
create index if not exists ix_politicians_name_trgm on politicians using gin (full_name gin_trgm_ops) where deleted_at is null;
drop trigger if exists trg_politicians_updated_at on politicians;
create trigger trg_politicians_updated_at before update on politicians
  for each row execute function set_updated_at();

-- mandates
create table if not exists mandates (
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
create index if not exists ix_mandates_politician_active on mandates (politician_id, is_active) where deleted_at is null;
create index if not exists ix_mandates_function on mandates (function_id) where deleted_at is null;
drop trigger if exists trg_mandates_updated_at on mandates;
create trigger trg_mandates_updated_at before update on mandates
  for each row execute function set_updated_at();
