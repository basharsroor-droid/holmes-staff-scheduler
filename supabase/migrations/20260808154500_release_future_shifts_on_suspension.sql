-- When a manager suspends an employee, automatically remove them from any
-- future shift they're still assigned to.
--
-- Gap: suspending someone (the only "employee is leaving" state the app
-- has today) only flipped organization_memberships.status -- it never
-- touched shift_assignments. A suspended employee stayed visibly
-- scheduled on every future shift (draft or already published) until a
-- manager happened to notice and manually unassigned them one shift at a
-- time, silently understaffing every shift they were still listed on.
--
-- Scope: only assignments for shifts dated today or later are removed --
-- past shifts are left untouched, so payroll/attendance history for work
-- already done stays intact. Reactivating a suspended employee does not
-- restore the removed assignments; re-adding them to future shifts is a
-- deliberate scheduling action for the manager to make again, not state
-- to keep silently pending.
--
-- Tested live against the pilot organization: suspending a real member
-- removed their one real future (published) assignment while leaving a
-- synthetic past-dated assignment untouched, then all test state was
-- restored to its original values.

create or replace function public.release_future_shifts_on_suspension()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.shift_assignments a
  using public.shifts s
  where a.shift_id = s.id
    and a.user_id = new.user_id
    and a.organization_id = new.organization_id
    and s.shift_date >= current_date;

  return new;
end;
$$;

revoke all on function public.release_future_shifts_on_suspension() from public, anon;

drop trigger if exists organization_memberships_release_future_shifts on public.organization_memberships;
create trigger organization_memberships_release_future_shifts
  after update on public.organization_memberships
  for each row
  when (new.status = 'suspended' and old.status is distinct from 'suspended')
  execute function public.release_future_shifts_on_suspension();

comment on function public.release_future_shifts_on_suspension()
  is 'Removes a suspended member from every shift dated today or later, in their organization only. Past shifts are left untouched.';
