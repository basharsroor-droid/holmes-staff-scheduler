-- Enforce availability ownership and submission windows in PostgreSQL.

create or replace function private.enforce_availability_submission_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  row_value public.availability_submissions%rowtype;
  period_value public.schedule_periods%rowtype;
  caller_is_manager boolean;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  row_value := case when tg_op = 'DELETE' then old else new end;

  select * into period_value
  from public.schedule_periods p
  where p.id = row_value.schedule_period_id
    and p.organization_id = row_value.organization_id;

  if period_value.id is null then raise exception 'Invalid schedule period'; end if;

  select exists (
    select 1 from public.organization_memberships m
    where m.organization_id = row_value.organization_id
      and m.user_id = current_user_id
      and m.status = 'active'
      and m.role in ('owner','admin','manager')
  ) into caller_is_manager;

  if tg_op = 'UPDATE' and caller_is_manager then
    if (to_jsonb(new) - array['manager_note','updated_at'])
      <> (to_jsonb(old) - array['manager_note','updated_at']) then
      raise exception 'Manager may update the internal note only';
    end if;
    return new;
  end if;

  if row_value.user_id <> current_user_id then
    raise exception 'Employees may write their own availability only';
  end if;
  if period_value.status <> 'collecting'
    or now() < period_value.submission_opens_at
    or now() > period_value.submission_closes_at then
    raise exception 'Availability submission window is closed';
  end if;

  if tg_op = 'INSERT' then
    if new.manager_note is not null then raise exception 'Employee may not write a manager note'; end if;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if (to_jsonb(new) - array['submitted_at','updated_at'])
      <> (to_jsonb(old) - array['submitted_at','updated_at']) then
      raise exception 'Employee may update submission status only';
    end if;
    return new;
  end if;

  return old;
end;
$$;

create or replace function private.enforce_availability_entry_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  row_value public.availability_entries%rowtype;
  submission_value public.availability_submissions%rowtype;
  period_value public.schedule_periods%rowtype;
  template_branch_id uuid;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  row_value := case when tg_op = 'DELETE' then old else new end;

  select * into submission_value
  from public.availability_submissions s
  where s.id = row_value.submission_id
    and s.organization_id = row_value.organization_id;

  if submission_value.id is null or submission_value.user_id <> current_user_id then
    raise exception 'Employees may write entries for their own submission only';
  end if;

  select * into period_value
  from public.schedule_periods p
  where p.id = submission_value.schedule_period_id
    and p.organization_id = submission_value.organization_id;

  if period_value.id is null
    or period_value.status <> 'collecting'
    or now() < period_value.submission_opens_at
    or now() > period_value.submission_closes_at then
    raise exception 'Availability submission window is closed';
  end if;

  if tg_op = 'UPDATE' and (
    new.organization_id <> old.organization_id
    or new.submission_id <> old.submission_id
    or new.shift_template_id <> old.shift_template_id
    or new.shift_date <> old.shift_date
    or new.created_at <> old.created_at
  ) then
    raise exception 'Availability entry identity fields are immutable';
  end if;

  select t.branch_id into template_branch_id
  from public.shift_templates t
  where t.id = row_value.shift_template_id
    and t.organization_id = row_value.organization_id
    and t.active;

  if template_branch_id is null or template_branch_id <> period_value.branch_id then
    raise exception 'Shift template does not belong to the schedule branch';
  end if;
  if extract(year from row_value.shift_date)::int <> period_value.year
    or extract(month from row_value.shift_date)::int <> period_value.month then
    raise exception 'Availability date is outside the schedule period';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function private.enforce_availability_submission_write() from public, anon, authenticated;
revoke all on function private.enforce_availability_entry_write() from public, anon, authenticated;

drop trigger if exists enforce_availability_submission_write on public.availability_submissions;
create trigger enforce_availability_submission_write
before insert or update or delete on public.availability_submissions
for each row execute function private.enforce_availability_submission_write();

drop trigger if exists enforce_availability_entry_write on public.availability_entries;
create trigger enforce_availability_entry_write
before insert or update or delete on public.availability_entries
for each row execute function private.enforce_availability_entry_write();

comment on function private.enforce_availability_submission_write()
  is 'Restricts employee submissions to their active collection window and reserves manager_note for managers.';
comment on function private.enforce_availability_entry_write()
  is 'Restricts availability entries to the owner, active window, period month, branch, and template.';
