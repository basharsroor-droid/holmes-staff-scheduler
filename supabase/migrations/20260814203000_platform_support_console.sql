alter table public.support_tickets add column organization_name text;

update public.support_tickets ticket
set organization_name = organization.name
from public.organizations organization
where organization.id = ticket.organization_id;

alter table public.support_tickets alter column organization_name set not null;

create or replace function private.set_support_ticket_organization_name()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select organization.name into new.organization_name
  from public.organizations organization
  where organization.id = new.organization_id;
  if new.organization_name is null then raise exception 'Organization not found'; end if;
  return new;
end;
$$;

create trigger set_support_ticket_organization_name
before insert on public.support_tickets
for each row execute function private.set_support_ticket_organization_name();

revoke all on function private.set_support_ticket_organization_name() from public, anon, authenticated;
