-- Multi-branch organizations can divide each branch into operational
-- departments. Existing branch data is preserved by creating a default
-- department per branch and assigning every branch-scoped membership to it.

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  branch_id uuid not null,
  name text not null check (char_length(trim(name)) between 2 and 120),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id, branch_id),
  unique (branch_id, name),
  foreign key (branch_id, organization_id)
    references public.branches(id, organization_id) on delete cascade
);

alter table public.departments enable row level security;

alter table public.organization_memberships
  add column access_scope text not null default 'self'
  check (access_scope in ('organization', 'branch', 'department', 'self'));

alter table public.organization_memberships
  add constraint organization_memberships_id_org_branch_key
  unique (id, organization_id, branch_id);

update public.organization_memberships
set access_scope = case
  when role in ('owner', 'admin') then 'organization'
  when role = 'manager' and branch_id is null then 'organization'
  when role = 'manager' then 'branch'
  else 'self'
end;

create table public.department_memberships (
  department_id uuid not null,
  membership_id uuid not null references public.organization_memberships(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  branch_id uuid not null,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (department_id, membership_id),
  foreign key (department_id, organization_id, branch_id)
    references public.departments(id, organization_id, branch_id) on delete cascade,
  foreign key (membership_id, organization_id, branch_id)
    references public.organization_memberships(id, organization_id, branch_id) on delete cascade,
  foreign key (branch_id, organization_id)
    references public.branches(id, organization_id) on delete cascade
);

alter table public.department_memberships enable row level security;

create unique index department_memberships_one_primary
  on public.department_memberships(membership_id)
  where is_primary;

create index departments_org_branch_idx
  on public.departments(organization_id, branch_id) where active;

create index department_memberships_membership_idx
  on public.department_memberships(membership_id);

insert into public.departments (organization_id, branch_id, name)
select branch.organization_id, branch.id, 'מחלקה כללית'
from public.branches branch
on conflict (branch_id, name) do nothing;

insert into public.department_memberships (
  department_id, membership_id, organization_id, branch_id, is_primary
)
select department.id, membership.id, membership.organization_id, membership.branch_id, true
from public.organization_memberships membership
join public.departments department
  on department.organization_id = membership.organization_id
 and department.branch_id = membership.branch_id
 and department.name = 'מחלקה כללית'
where membership.branch_id is not null
on conflict (department_id, membership_id) do nothing;

create or replace function private.can_access_department(target_department_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.departments department
    join public.organization_memberships membership
      on membership.organization_id = department.organization_id
     and membership.user_id = (select auth.uid())
     and membership.status = 'active'
    where department.id = target_department_id
      and (
        membership.access_scope = 'organization'
        or (membership.access_scope = 'branch' and membership.branch_id = department.branch_id)
        or exists (
          select 1 from public.department_memberships department_membership
          where department_membership.department_id = department.id
            and department_membership.membership_id = membership.id
        )
      )
  );
$$;

create or replace function private.can_manage_department(target_department_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.departments department
    join public.organization_memberships membership
      on membership.organization_id = department.organization_id
     and membership.user_id = (select auth.uid())
     and membership.status = 'active'
    where department.id = target_department_id
      and (
        membership.role in ('owner', 'admin')
        or (
          membership.role = 'manager'
          and (
            (membership.access_scope = 'branch' and membership.branch_id = department.branch_id)
            or (
              membership.access_scope = 'department'
              and exists (
                select 1 from public.department_memberships department_membership
                where department_membership.department_id = department.id
                  and department_membership.membership_id = membership.id
              )
            )
          )
        )
      )
  );
$$;

create policy departments_select_scoped
on public.departments for select to authenticated
using ((select private.can_access_department(departments.id)));

create policy departments_insert_admin
on public.departments for insert to authenticated
with check ((select private.has_org_role(departments.organization_id, array['owner','admin']::public.member_role[])));

create policy departments_update_admin
on public.departments for update to authenticated
using ((select private.has_org_role(departments.organization_id, array['owner','admin']::public.member_role[])))
with check ((select private.has_org_role(departments.organization_id, array['owner','admin']::public.member_role[])));

create policy departments_delete_admin
on public.departments for delete to authenticated
using ((select private.has_org_role(departments.organization_id, array['owner','admin']::public.member_role[])));

create policy department_memberships_select_scoped
on public.department_memberships for select to authenticated
using (
  exists (
    select 1 from public.organization_memberships own_membership
    where own_membership.id = department_memberships.membership_id
      and own_membership.user_id = (select auth.uid())
  )
  or (select private.can_manage_department(department_memberships.department_id))
);

create or replace function public.set_membership_departments(
  target_membership_id uuid,
  target_department_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_membership public.organization_memberships%rowtype;
  department_count integer;
begin
  select * into target_membership
  from public.organization_memberships
  where id = target_membership_id;

  if target_membership.id is null or target_membership.branch_id is null then
    raise exception 'A branch-scoped membership is required';
  end if;

  if not (select private.has_org_role(
    target_membership.organization_id,
    array['owner','admin']::public.member_role[]
  )) and not exists (
    select 1 from public.organization_memberships caller
    where caller.organization_id = target_membership.organization_id
      and caller.user_id = (select auth.uid())
      and caller.status = 'active'
      and caller.role = 'manager'
      and caller.access_scope = 'branch'
      and caller.branch_id = target_membership.branch_id
  ) then
    raise exception 'Insufficient permission';
  end if;

  select count(*) into department_count
  from public.departments department
  where department.id = any(coalesce(target_department_ids, array[]::uuid[]))
    and department.organization_id = target_membership.organization_id
    and department.branch_id = target_membership.branch_id
    and department.active;

  if department_count <> cardinality(coalesce(target_department_ids, array[]::uuid[])) then
    raise exception 'Every department must be active and belong to the membership branch';
  end if;

  if target_membership.role = 'employee' and department_count = 0 then
    raise exception 'Employees must belong to at least one department';
  end if;

  delete from public.department_memberships
  where membership_id = target_membership.id;

  insert into public.department_memberships (
    department_id, membership_id, organization_id, branch_id, is_primary
  )
  select selected.department_id, target_membership.id, target_membership.organization_id,
         target_membership.branch_id, ordinal = 1
  from unnest(coalesce(target_department_ids, array[]::uuid[])) with ordinality as selected(department_id, ordinal);

  update public.organization_memberships
  set access_scope = case
    when role in ('owner', 'admin') then 'organization'
    when role = 'manager' and department_count > 0 then 'department'
    when role = 'manager' then 'branch'
    else 'self'
  end,
  updated_at = now()
  where id = target_membership.id;
end;
$$;

revoke all on function public.set_membership_departments(uuid, uuid[]) from public, anon;
grant execute on function public.set_membership_departments(uuid, uuid[]) to authenticated;

comment on table public.departments is
  'Operational departments nested beneath a branch.';
comment on table public.department_memberships is
  'Scopes employees and department managers to one or more departments.';
comment on column public.organization_memberships.access_scope is
  'organization: all branches; branch: every department in branch; department: assigned departments; self: own employee data.';
