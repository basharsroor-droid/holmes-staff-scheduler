# Email notifications setup

The application code, queue, retry worker, Hebrew templates and user preferences are versioned in this repository. Production delivery needs these secrets:

- `RESEND_API_KEY` — a restricted Resend sending key.
- `EMAIL_FROM` — a verified sender such as `ShiftPilot <notifications@shiftpilot.co.il>`.
- `CRON_SECRET` — a random value shared by Vercel and GitHub Actions.
- `NEXT_PUBLIC_APP_URL` — the canonical production URL.

Add `CRON_SECRET` and `NOTIFICATION_CRON_URL` (`https://<production-domain>/api/cron/notifications`) as GitHub Actions secrets. The workflow runs every ten minutes; the database guarantees idempotency and retries temporary failures with exponential backoff.

Supabase Auth email (registration, invitation and password recovery) still originates in Supabase Auth. Configure the same verified Resend SMTP credentials under Authentication → Email/SMTP and paste the versioned templates from `supabase/email-templates` into the matching Auth templates. Never expose the Resend key in a `NEXT_PUBLIC_*` variable.

After deployment, use `workflow_dispatch` once and confirm that the endpoint reports `claimed`, `sent` and `failed`. A missing provider configuration is recorded as a retry rather than losing the notification.
