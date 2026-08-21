-- The dedicated sales/App Review tenant is shared infrastructure. Its login
-- credentials are intentionally distributed, so neither those users nor an
-- accidental service-role call may delete it. Application checks provide a
-- friendly response; this trigger is the final database-level invariant.

create or replace function public.prevent_demo_organization_deletion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.is_demo then
    raise exception 'Demo organizations cannot be deleted';
  end if;

  return old;
end;
$$;

revoke all on function public.prevent_demo_organization_deletion() from public, anon, authenticated;

drop trigger if exists organizations_protect_demo_deletion on public.organizations;
create trigger organizations_protect_demo_deletion
before delete on public.organizations
for each row execute function public.prevent_demo_organization_deletion();

comment on function public.prevent_demo_organization_deletion() is
  'Prevents deletion of organizations marked is_demo, including service-role deletion attempts.';
