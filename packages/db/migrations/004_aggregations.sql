-- politikar 004_aggregations
-- Materialized views for politician/party/function/region stats.

create materialized view if not exists politician_stats as
with verified as (
  select
    c.politician_id,
    v.verdict,
    v.confidence_score,
    c.claim_type
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

create unique index if not exists ux_politician_stats_id on politician_stats (politician_id);
create index if not exists ix_politician_stats_factual_count on politician_stats (factual_claims_count desc);

-- Party stats : aggregate over politicians of the party
create materialized view if not exists party_stats as
select
  p.current_party_id as party_id,
  count(distinct ps.politician_id) as politicians_count,
  sum(ps.factual_claims_count) as factual_claims_count,
  sum(ps.true_count) as true_count,
  sum(ps.mostly_true_count) as mostly_true_count,
  sum(ps.mixed_count) as mixed_count,
  sum(ps.mostly_false_count) as mostly_false_count,
  sum(ps.false_count) as false_count,
  sum(ps.unverifiable_count) as unverifiable_count,
  sum(ps.misleading_count) as misleading_count,
  sum(ps.promises_made) as promises_made,
  sum(ps.promises_kept) as promises_kept,
  sum(ps.promises_partially_kept) as promises_partially_kept,
  sum(ps.promises_broken) as promises_broken,
  now() as computed_at
from politician_stats ps
join politicians p on p.id = ps.politician_id
where p.current_party_id is not null and p.deleted_at is null
group by p.current_party_id;
create unique index if not exists ux_party_stats_id on party_stats (party_id);

create materialized view if not exists function_stats as
select
  p.current_function_id as function_id,
  count(distinct ps.politician_id) as politicians_count,
  sum(ps.factual_claims_count) as factual_claims_count,
  sum(ps.true_count) as true_count,
  sum(ps.mostly_true_count) as mostly_true_count,
  sum(ps.mixed_count) as mixed_count,
  sum(ps.mostly_false_count) as mostly_false_count,
  sum(ps.false_count) as false_count,
  sum(ps.unverifiable_count) as unverifiable_count,
  sum(ps.misleading_count) as misleading_count,
  sum(ps.promises_made) as promises_made,
  sum(ps.promises_kept) as promises_kept,
  sum(ps.promises_partially_kept) as promises_partially_kept,
  sum(ps.promises_broken) as promises_broken,
  now() as computed_at
from politician_stats ps
join politicians p on p.id = ps.politician_id
where p.current_function_id is not null and p.deleted_at is null
group by p.current_function_id;
create unique index if not exists ux_function_stats_id on function_stats (function_id);

create materialized view if not exists region_stats as
select
  p.current_region_id as region_id,
  count(distinct ps.politician_id) as politicians_count,
  sum(ps.factual_claims_count) as factual_claims_count,
  sum(ps.true_count) as true_count,
  sum(ps.mostly_true_count) as mostly_true_count,
  sum(ps.mixed_count) as mixed_count,
  sum(ps.mostly_false_count) as mostly_false_count,
  sum(ps.false_count) as false_count,
  now() as computed_at
from politician_stats ps
join politicians p on p.id = ps.politician_id
where p.current_region_id is not null and p.deleted_at is null
group by p.current_region_id;
create unique index if not exists ux_region_stats_id on region_stats (region_id);

create or replace function refresh_all_stats() returns void language plpgsql as $$
begin
  refresh materialized view concurrently politician_stats;
  refresh materialized view concurrently party_stats;
  refresh materialized view concurrently function_stats;
  refresh materialized view concurrently region_stats;
end;
$$;
