-- Automatically audit critical management changes without storing secrets or tokens.

create or replace function private.write_management_audit_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  row_value jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  target_organization_id uuid;
  target_entity_id uuid;
  safe_metadata jsonb;
begin
  target_organization_id := case
    when tg_table_name = 'organizations' then (row_value ->> 'id')::uuid
    else (row_value ->> 'organization_id')::uuid
  end;
  target_entity_id := (row_value ->> 'id')::uuid;

  if target_organization_id is null or target_entity_id is null then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  safe_metadata := jsonb_strip_nulls(jsonb_build_object(
    'operation', lower(tg_op),
    'role', row_value ->> 'role',
    'status', row_value ->> 'status',
    'name', case
      when tg_table_name in ('organizations','branches','shift_templates')
      then row_value ->> 'name'
      else null
    end,
    'year', row_value ->> 'year',
    'month', row_value ->> 'month'
  ));

  insert into public.audit_logs (
    organization_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) values (
    target_organization_id,
    (select auth.uid()),
    tg_table_name || '.' || lower(tg_op),
    tg_table_name,
    target_entity_id,
    safe_metadata
  );

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function private.write_management_audit_log() from public, anon, authenticated;

drop trigger if exists audit_organizations_update on public.organizations;
create trigger audit_organizations_update
after update on public.organizations
for each row execute function private.write_management_audit_log();

drop trigger if exists audit_branches_write on public.branches;
create trigger audit_branches_write
after insert or update or delete on public.branches
for each row execute function private.write_management_audit_log();

drop trigger if exists audit_memberships_write on public.organization_memberships;
create trigger audit_memberships_write
after insert or update or delete on public.organization_memberships
for each row execute function private.write_management_audit_log();

drop trigger if exists audit_shift_templates_write on public.shift_templates;
create trigger audit_shift_templates_write
after insert or update or delete on public.shift_templates
for each row execute function private.write_management_audit_log();

drop trigger if exists audit_schedule_periods_write on public.schedule_periods;
create trigger audit_schedule_periods_write
after insert or update or delete on public.schedule_periods
for each row execute function private.write_management_audit_log();

comment on function private.write_management_audit_log()
  is 'Records safe metadata for critical management changes; excludes emails, tokens, notes, and credentials.';
