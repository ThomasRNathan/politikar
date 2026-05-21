-- politikar 006_rls
-- Row level security. Defensive : Supabase pre-creates the
-- service_role/authenticated/anon roles ; Neon and bare Postgres do not.
-- We enable RLS unconditionally on every table, then create policies and
-- grants only if the target role exists. Migration becomes a no-op for
-- the role-specific parts on a stock Neon project (acceptable : all
-- writes flow through our app code using the owner connection).

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

do $$
declare
  t text;
  has_service_role boolean;
  has_authenticated boolean;
  has_anon boolean;
begin
  select exists(select 1 from pg_roles where rolname = 'service_role') into has_service_role;
  select exists(select 1 from pg_roles where rolname = 'authenticated') into has_authenticated;
  select exists(select 1 from pg_roles where rolname = 'anon') into has_anon;

  for t in select unnest(array[
    'politicians','parties','functions','regions','mandates',
    'sources','claims','verifications','press_coverage',
    'claim_review_queue','prompt_versions','audit_log',
    'politician_truth_scores'
  ]) loop
    if has_service_role then
      execute format(
        'drop policy if exists svc_full_access on %I; '
        'create policy svc_full_access on %I for all to service_role using (true) with check (true);',
        t, t
      );
    end if;
    if has_authenticated then
      execute format(
        'drop policy if exists admin_full_access on %I; '
        'create policy admin_full_access on %I for all to authenticated '
        'using (auth.jwt() ->> ''app_role'' = ''admin'') '
        'with check (auth.jwt() ->> ''app_role'' = ''admin'');',
        t, t
      );
    end if;
  end loop;

  if has_anon then
    grant select on _public_politicians,
                     _public_parties,
                     _public_functions,
                     _public_regions,
                     _public_claims,
                     _public_verifications,
                     _public_truth_scores
      to anon, authenticated;
  end if;

  -- On Neon and bare Postgres, the connecting user is the owner of these
  -- objects and bypasses RLS. We rely on application-level access control
  -- until a public anon role is provisioned.
end$$;
