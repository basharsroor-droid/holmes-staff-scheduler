-- Prevent an organization from ending up with zero active owners.
--
-- Nothing today stops a manager (or a bug) from demoting, suspending, or
-- deleting the last active `owner` membership of an organization, which
-- would leave the business with no one able to manage it -- effectively
-- orphaning it (invitations, ownership transfer, branch management all
-- require an owner/admin).
--
-- Guards UPDATE and DELETE on organization_memberships: if the row being
-- changed is currently an active owner, and the change would remove that
-- (role change, status change, or deletion), it's blocked unless at least
-- one other active owner remains in the same organization. Unrelated field
-- updates (seniority, phone, etc.) are unaffected.

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

drop trigger if exists organization_memberships_last_owner_guard on public.organization_memberships;
create trigger organization_memberships_last_owner_guard
  before update or delete on public.organization_memberships
  for each row execute function public.check_last_active_owner();
