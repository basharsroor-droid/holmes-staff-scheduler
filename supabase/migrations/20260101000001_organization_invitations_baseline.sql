-- Second half of the retroactively captured baseline (see
-- 20260101000000_baseline_schema.sql for the full explanation).
--
-- public.organization_invitations also predates migration tracking: the
-- very first tracked migration (20260807172343_harden_privileged_auth_rpcs)
-- already reads and writes it via accept_organization_invitation, so it
-- must exist before that migration runs. Reconstructed from Production's
-- live schema, minus the parts later tracked migrations already own:
--   - last_notified_at is added by 20260808160000_invitation_resend_cooldown
--     (add column if not exists).
--   - the organization_id/email partial unique index is created by
--     20260816121707_pending_invitation_email_uniqueness.
--   - the invitations_select_manager policy defined here is dropped and
--     replaced by invitations_select_scoped in
--     20260821123000_department_authorization_policies.
--   - the record_invite_created_event trigger is created by
--     20260821170000_first_party_observability.
-- All four are left to their existing tracked migrations; nothing here
-- duplicates them.

create table public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  branch_id uuid not null,
  email text not null check (email = lower(trim(email)) and char_length(email) between 5 and 320),
  first_name text not null check (char_length(first_name) between 1 and 80),
  last_name text not null default '' check (char_length(last_name) <= 80),
  role public.member_role not null default 'employee' check (role in ('admin', 'manager', 'employee')),
  token uuid not null unique default gen_random_uuid(),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked', 'expired')),
  invited_by uuid not null references auth.users(id) on delete restrict,
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (branch_id, organization_id) references public.branches(id, organization_id)
);

create index organization_invitations_org_status_idx on public.organization_invitations(organization_id, status, created_at desc);
create index organization_invitations_token_idx on public.organization_invitations(token);
create index organization_invitations_branch_org_idx on public.organization_invitations(branch_id, organization_id);
create index organization_invitations_invited_by_idx on public.organization_invitations(invited_by);
create index organization_invitations_accepted_by_idx on public.organization_invitations(accepted_by);

alter table public.organization_invitations enable row level security;

create policy invitations_select_manager on public.organization_invitations for select to authenticated
using ((select private.has_org_role(organization_id, array['owner','admin','manager']::public.member_role[])));

grant select, insert, update, delete on public.organization_invitations to authenticated;
