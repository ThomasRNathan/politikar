-- politikar 005_public_views
-- Read-only views exposed to the anon role through the Next.js public API.
-- Tables themselves remain protected by RLS (see 006_rls.sql).

create or replace view _public_politicians as
select
  id, country, full_name, slug, given_name, family_name,
  birth_date, gender, current_party_id, current_function_id,
  current_region_id, photo_url, wikidata_id, tier
from politicians
where deleted_at is null;

create or replace view _public_parties as
select id, country, name, short_name, slug, political_family,
       color_hex, logo_url, wikidata_id
from parties
where deleted_at is null;

create or replace view _public_functions as
select id, country, name, slug, level, scope_region_id
from functions
where deleted_at is null;

create or replace view _public_regions as
select id, country, name, slug, level, parent_region_id, geojson
from regions
where deleted_at is null;

create or replace view _public_claims as
select
  c.id, c.politician_id, c.source_id, c.claim_text, c.claim_type,
  c.topic_tags, c.numeric_values, c.extracted_at, c.created_at
from claims c
where exists (
  select 1 from verifications v
  where v.claim_id = c.id
    and v.superseded_by_verification_id is null
    and v.is_published = true
)
and c.deleted_at is null
and c.duplicate_of_claim_id is null;

create or replace view _public_verifications as
select
  v.id, v.claim_id, v.verdict, v.confidence_score,
  v.reasoning, v.evidence, v.data_sources_used,
  v.human_reviewed, v.created_at
from verifications v
where v.superseded_by_verification_id is null
  and v.is_published = true;

create or replace view _public_truth_scores as
select
  politician_id, truth_score, factual_score, promise_score,
  transparency_score, ci_low, ci_high, topic_breakdown,
  is_significant, scoring_version, computed_at
from politician_truth_scores;
