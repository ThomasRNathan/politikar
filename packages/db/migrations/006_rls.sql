-- politikar 006_rls
-- Row level security : default deny on every table, service_role full
-- access for the FastAPI/workers, admin role full via JWT claim.

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

-- service_role bypass already exists in Supabase by default but we make it
-- explicit for clarity when self-hosting Postgres.
do $$
declare
  t text;
begin
  for t in select unnest(array[
    'politicians','parties','functions','regions','mandates',
    'sources','claims','verifications','press_coverage',
    'claim_review_queue','prompt_versions','audit_log',
    'politician_truth_scores'
  ]) loop
    execute format(
      'drop policy if exists svc_full_access on %I; '
      'create policy svc_full_access on %I for all to service_role using (true) with check (true);',
      t, t
    );
    execute format(
      'drop policy if exists admin_full_access on %I; '
      'create policy admin_full_access on %I for all to authenticated '
      'using (auth.jwt() ->> ''app_role'' = ''admin'') '
      'with check (auth.jwt() ->> ''app_role'' = ''admin'');',
      t, t
    );
  end loop;
end$$;

-- anon never reads tables directly. The _public_* views are accessed via
-- the API role which Supabase exposes through PostgREST.
grant select on _public_politicians,
                 _public_parties,
                 _public_functions,
                 _public_regions,
                 _public_claims,
                 _public_verifications,
                 _public_truth_scores
  to anon, authenticated;
