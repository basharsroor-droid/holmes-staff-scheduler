-- Captures in version control a safety constraint that was found to exist
-- on production but was missing from the tracked migration history --
-- discovered while doing a systematic edge-case pass (P0-06 in the
-- roadmap: "מייל כפול", "שני מנהלים במקביל"). Without this migration,
-- a fresh database built from scratch (a new environment, a disaster
-- recovery restore, a future Supabase branch) would silently lack this
-- protection even though production currently has it.
--
-- What it protects against: public.create_organization_invitation()
-- (see the auth-rpc-hardening migration) is not atomic -- it does an
-- UPDATE ... WHERE status = 'pending', and only INSERTs a new row if
-- that UPDATE matched nothing. Under READ COMMITTED (Postgres's
-- default), two concurrent invitations for the same email in the same
-- organization (e.g. two managers inviting the same person at the same
-- moment) can both see "not found" and both INSERT, producing two
-- pending invitation rows for one email with two different tokens.
--
-- This partial unique index makes that scenario fail loudly at the
-- database layer instead of silently succeeding twice: the second
-- concurrent INSERT raises a unique_violation, which the RPC's caller
-- (app/workspace/employees/employees-client.tsx) already surfaces as a
-- generic "לא הצלחנו ליצור את ההזמנה" error -- no raw DB error leaks to
-- the user, and no duplicate row is ever persisted. Verified directly
-- against production on 16.8.2026 with a begin/rollback SQL transaction
-- that reproduced the double-insert and confirmed the second one is
-- rejected.
--
-- `if not exists` because this index already exists on the live
-- production database (created directly, outside of migration
-- tracking, before this file existed) -- this migration's job is only
-- to make the existing protection reproducible from scratch.
create unique index if not exists organization_invitations_pending_email_idx
  on public.organization_invitations (organization_id, email)
  where status = 'pending';

comment on index public.organization_invitations_pending_email_idx is
  'Prevents two pending invitations for the same email in the same organization, including under a genuine concurrent-invite race (see migration header). Without this, create_organization_invitation()''s update-then-insert-if-not-found pattern has a TOCTOU window.';
