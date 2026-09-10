-- Schema invariants (D3 in docs/REMEDIATION_PLAN.md).
--
-- Run against a database built from supabase/migrations/ (the
-- schema-invariants CI job does this with `supabase db start`), so every PR
-- is checked against the schema IT produces -- not against production, and
-- not against a hand-maintained snapshot.
--
-- Each check is a rule this project already follows everywhere; the job
-- fails, listing every offending object, the moment a migration breaks one.
-- All five held on production on 2026-09-10 (30 tables, 61 SECURITY DEFINER
-- functions, 81 foreign keys, 67 policies, 0 violations).
--
--   1. every public table has row level security enabled
--   2. every SECURITY DEFINER function in public/private pins search_path = ''
--   3. every public foreign key has an index whose leading columns cover it
--   4. no public policy calls auth.<fn>() per row -- it must be wrapped as
--      (select auth.<fn>()) so Postgres evaluates it once per statement
--   5. the anon role cannot execute any public SECURITY DEFINER function
--
-- Extension-owned objects are excluded: they aren't ours to change.

do $$
declare
  violations text;
  summary text;
begin
  with
  rls as (
    select 'table_without_rls'::text as check_name, format('%I.%I', n.nspname, c.relname) as object
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity
      and not exists (select 1 from pg_depend d where d.objid = c.oid and d.deptype = 'e')
  ),
  definer as (
    select 'definer_without_empty_search_path', format('%I.%I(%s)', n.nspname, p.proname, pg_get_function_identity_arguments(p.oid))
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where p.prosecdef and n.nspname in ('public', 'private')
      and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
      and coalesce(array_to_string(p.proconfig, ','), '') not like '%search_path=""%'
  ),
  fk as (
    select 'foreign_key_without_index', format('%I.%I (%s)', n.nspname, c.relname, con.conname)
    from pg_constraint con
    join pg_class c on c.oid = con.conrelid
    join pg_namespace n on n.oid = c.relnamespace
    where con.contype = 'f' and n.nspname = 'public'
      and not exists (
        select 1 from pg_index i
        where i.indrelid = con.conrelid
          -- an array slice always starts at subscript 1, so this compares
          -- the index's leading columns with the FK's columns, in order
          and (i.indkey::int2[])[0:array_length(con.conkey, 1) - 1] = con.conkey
      )
  ),
  pol as (
    select 'policy_with_per_row_auth_call', format('%I.%I: %s', p.schemaname, p.tablename, p.policyname)
    from pg_policies p
    cross join lateral (select coalesce(p.qual, '') || ' ' || coalesce(p.with_check, '') as e) x
    where p.schemaname = 'public'
      and regexp_count(x.e, 'auth\.[a-z_]+\(\)') > regexp_count(x.e, 'SELECT auth\.[a-z_]+\(\)')
  ),
  anon as (
    select 'definer_executable_by_anon', format('%I.%I(%s)', n.nspname, p.proname, pg_get_function_identity_arguments(p.oid))
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where p.prosecdef and n.nspname = 'public'
      and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
      and has_function_privilege('anon', p.oid, 'execute')
  ),
  everything as (
    select * from rls
    union all select * from definer
    union all select * from fk
    union all select * from pol
    union all select * from anon
  )
  select string_agg(check_name || ': ' || object, E'\n' order by check_name, object)
  into violations
  from everything;

  if violations is not null then
    raise exception E'Schema invariants violated:\n%', violations;
  end if;

  select format('Schema invariants hold: %s tables, %s SECURITY DEFINER functions, %s foreign keys, %s policies',
    (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind in ('r', 'p')),
    (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where p.prosecdef and n.nspname in ('public', 'private')),
    (select count(*) from pg_constraint con join pg_namespace n on n.oid = con.connamespace where con.contype = 'f' and n.nspname = 'public'),
    (select count(*) from pg_policies where schemaname = 'public'))
  into summary;
  raise notice '%', summary;
end
$$;
