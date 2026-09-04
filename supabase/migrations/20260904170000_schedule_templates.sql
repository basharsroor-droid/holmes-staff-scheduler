-- Phase 1: reusable schedule templates
-- Saves shift structure only. Employee assignments and availability are intentionally excluded.

create table public.schedule_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  department_id uuid not null references public.departments(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.schedule_template_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  schedule_template_id uuid not null references public.schedule_templates(id) on delete cascade,
  shift_template_id uuid references public.shift_templates(id) on delete set null,
  weekday smallint not null check (weekday between 0 and 6),
  occurrence smallint not null check (occurrence between 1 and 6),
  name text not null,
  start_time time not null,
  end_time time not null,
  required_employees integer not null check (required_employees > 0),
  created_at timestamptz not null default now()
);

create index schedule_templates_scope_idx
  on public.schedule_templates (organization_id, department_id, created_at desc);
create index schedule_template_items_template_idx
  on public.schedule_template_items (schedule_template_id, weekday, occurrence, start_time);

alter table public.schedule_templates enable row level security;
alter table public.schedule_template_items enable row level security;

create policy "managers read schedule templates"
on public.schedule_templates
for select to authenticated
using (
  exists (
    select 1 from public.organization_memberships om
    where om.organization_id = schedule_templates.organization_id
      and om.user_id = auth.uid()
      and om.status = 'active'
      and (
        om.role in ('owner','admin')
        or (
          om.role = 'manager'
          and exists (
            select 1 from public.department_memberships dm
            where dm.membership_id = om.id
              and dm.organization_id = om.organization_id
              and dm.department_id = schedule_templates.department_id
          )
        )
      )
  )
);

create policy "managers read schedule template items"
on public.schedule_template_items
for select to authenticated
using (
  exists (
    select 1 from public.schedule_templates st
    join public.organization_memberships om on om.organization_id = st.organization_id
    where st.id = schedule_template_items.schedule_template_id
      and om.user_id = auth.uid()
      and om.status = 'active'
      and (
        om.role in ('owner','admin')
        or (
          om.role = 'manager'
          and exists (
            select 1 from public.department_memberships dm
            where dm.membership_id = om.id
              and dm.organization_id = om.organization_id
              and dm.department_id = st.department_id
          )
        )
      )
  )
);

create or replace function public.save_schedule_template_from_period(
  source_period_id uuid,
  template_name text
)
returns public.schedule_templates
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  source_period public.schedule_periods%rowtype;
  saved_template public.schedule_templates%rowtype;
begin
  if actor_id is null then raise exception 'Authentication required'; end if;
  if nullif(trim(template_name), '') is null then raise exception 'Template name is required'; end if;

  select * into source_period
  from public.schedule_periods
  where id = source_period_id;

  if source_period.id is null then raise exception 'Schedule period not found'; end if;
  if not (select private.can_manage_schedule_period(source_period.id)) then raise exception 'Manager permission required'; end if;
  if not exists (select 1 from public.shifts s where s.schedule_period_id = source_period.id and s.status <> 'cancelled') then
    raise exception 'Source period has no shifts';
  end if;

  insert into public.schedule_templates (organization_id, branch_id, department_id, name, created_by)
  values (source_period.organization_id, source_period.branch_id, source_period.department_id, trim(template_name), actor_id)
  returning * into saved_template;

  insert into public.schedule_template_items (
    organization_id, schedule_template_id, shift_template_id, weekday, occurrence,
    name, start_time, end_time, required_employees
  )
  select
    source_period.organization_id,
    saved_template.id,
    s.shift_template_id,
    extract(dow from s.shift_date)::smallint,
    dense_rank() over (partition by extract(dow from s.shift_date) order by s.shift_date)::smallint,
    s.name,
    s.start_time,
    s.end_time,
    s.required_employees
  from public.shifts s
  where s.schedule_period_id = source_period.id
    and s.status <> 'cancelled'
  order by s.shift_date, s.start_time;

  return saved_template;
end;
$$;

create or replace function public.apply_schedule_template(
  target_period_id uuid,
  target_template_id uuid
)
returns table(shifts_created integer, items_skipped integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  target_period public.schedule_periods%rowtype;
  selected_template public.schedule_templates%rowtype;
  item record;
  target_date date;
  v_created integer := 0;
  v_skipped integer := 0;
begin
  if actor_id is null then raise exception 'Authentication required'; end if;

  select * into target_period from public.schedule_periods where id = target_period_id for update;
  select * into selected_template from public.schedule_templates where id = target_template_id;

  if target_period.id is null or selected_template.id is null then raise exception 'Period or template not found'; end if;
  if target_period.organization_id <> selected_template.organization_id
     or target_period.branch_id <> selected_template.branch_id
     or target_period.department_id <> selected_template.department_id then
    raise exception 'Template and target period must belong to the same department';
  end if;
  if not (select private.can_manage_schedule_period(target_period.id)) then raise exception 'Manager permission required'; end if;
  if exists (select 1 from public.shifts s where s.schedule_period_id = target_period.id) then
    raise exception 'Target period already has shifts; templates can only be applied to an empty schedule';
  end if;

  for item in
    select * from public.schedule_template_items sti
    where sti.schedule_template_id = selected_template.id
    order by sti.weekday, sti.occurrence, sti.start_time
  loop
    select generated_day::date into target_date
    from (
      select generated_day, row_number() over (order by generated_day) as occurrence
      from generate_series(
        make_date(target_period.year, target_period.month, 1),
        (make_date(target_period.year, target_period.month, 1) + interval '1 month - 1 day')::date,
        interval '1 day'
      ) generated_day
      where extract(dow from generated_day)::int = item.weekday
    ) matching_weekday
    where occurrence = item.occurrence;

    if target_date is null then
      v_skipped := v_skipped + 1;
      continue;
    end if;

    insert into public.shifts (
      organization_id, schedule_period_id, shift_template_id, shift_date,
      name, start_time, end_time, required_employees, status
    ) values (
      target_period.organization_id, target_period.id, item.shift_template_id, target_date,
      item.name, item.start_time, item.end_time, item.required_employees, 'draft'
    );
    v_created := v_created + 1;
  end loop;

  return query select v_created, v_skipped;
end;
$$;

create or replace function public.delete_schedule_template(target_template_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  selected_template public.schedule_templates%rowtype;
begin
  if actor_id is null then raise exception 'Authentication required'; end if;
  select * into selected_template from public.schedule_templates where id = target_template_id;
  if selected_template.id is null then raise exception 'Template not found'; end if;

  if not exists (
    select 1 from public.organization_memberships om
    where om.organization_id = selected_template.organization_id
      and om.user_id = actor_id
      and om.status = 'active'
      and (
        om.role in ('owner','admin')
        or (
          om.role = 'manager'
          and exists (
            select 1 from public.department_memberships dm
            where dm.membership_id = om.id
              and dm.organization_id = om.organization_id
              and dm.department_id = selected_template.department_id
          )
        )
      )
  ) then raise exception 'Manager permission required'; end if;

  delete from public.schedule_templates where id = selected_template.id;
end;
$$;

revoke all on function public.save_schedule_template_from_period(uuid, text) from public, anon;
revoke all on function public.apply_schedule_template(uuid, uuid) from public, anon;
revoke all on function public.delete_schedule_template(uuid) from public, anon;
grant execute on function public.save_schedule_template_from_period(uuid, text) to authenticated;
grant execute on function public.apply_schedule_template(uuid, uuid) to authenticated;
grant execute on function public.delete_schedule_template(uuid) to authenticated;

grant select on public.schedule_templates to authenticated;
grant select on public.schedule_template_items to authenticated;
