-- Let an organization be deleted even though its last active owner's
-- membership goes down with it.
--
-- check_last_active_owner() (20260808131500) blocks removing the last active
-- owner of an organization. That is right when someone is removed from a
-- business that keeps existing -- it would orphan the business, with nobody
-- able to invite, schedule, or manage anything.
--
-- But the same trigger also fires on the cascade delete that happens when the
-- ORGANIZATION ITSELF is deleted, and there it blocks something legitimate: a
-- sole owner closing their business and deleting their own account. App Store
-- guideline 5.1.1(v) requires an app that offers account creation to also
-- offer account deletion, and `/onboarding` creates accounts (auth.signUp), so
-- an owner with nobody to hand the business to must have a way out.
--
-- The distinction we need is "is this membership disappearing on its own, or
-- along with the whole organization?". Postgres performs the parent DELETE
-- first and only then applies the referential action on children, so by the
-- time this row trigger runs for a cascade, the organizations row is already
-- gone. That is the tell: no organization left means nothing left to orphan,
-- so the guard steps aside. A direct membership delete still sees its
-- organization present and stays guarded exactly as before.

create or replace function public.check_last_active_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  remaining_owners integer;
  target_org uuid;
begin
  target_org := old.organization_id;

  if old.role <> 'owner' or old.status <> 'active' then
    return coalesce(new, old);
  end if;

  if tg_op = 'UPDATE' and new.role = 'owner' and new.status = 'active' then
    return new;
  end if;

  -- Cascade from a deleted organization: the parent row is already gone.
  if tg_op = 'DELETE'
     and not exists (select 1 from public.organizations o where o.id = target_org) then
    return old;
  end if;

  select count(*) into remaining_owners
  from public.organization_memberships m
  where m.organization_id = target_org
    and m.role = 'owner'
    and m.status = 'active'
    and m.id <> old.id;

  if remaining_owners = 0 then
    raise exception 'Cannot remove the last active owner of an organization';
  end if;

  return coalesce(new, old);
end;
$$;

revoke all on function public.check_last_active_owner() from public, anon;
