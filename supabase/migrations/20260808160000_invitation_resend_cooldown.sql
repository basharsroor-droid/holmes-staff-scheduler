-- Track the last time an invitation email was actually sent, so the
-- resend action can be rate-limited.
--
-- Gap: POST /api/invitations/notify (both the initial send and every
-- "שליחה חוזרת" resend click) had no cooldown at all. The only
-- authorization check was that the caller is a manager-role member of the
-- invitation's own organization -- but that's not nothing: any owner/admin
-- of any organization on the platform could create an invitation
-- addressed to an email they don't own (create_organization_invitation
-- doesn't verify the target inbox) and then hammer resend to bombard that
-- address with unlimited invite emails. A basic per-invitation cooldown
-- closes this cheaply without needing a queue or an external rate-limit
-- service.
--
-- This migration only adds the tracking column; the cooldown check itself
-- lives in app/api/invitations/notify/route.ts, which updates this column
-- after each successful send.

alter table public.organization_invitations
  add column if not exists last_notified_at timestamptz;

comment on column public.organization_invitations.last_notified_at
  is 'When the invitation email was last actually sent. Used by /api/invitations/notify to enforce a resend cooldown.';
