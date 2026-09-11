# ShiftPilot — Deployment Status

**Last updated:** 2026-09-11

## Vercel plan

- Vercel Pro enabled on 2026-09-11.
- The previous Hobby plan hit the daily deployment limit (>100 deployments/day) while PR #288 was being merged.
- PR #288 was merged to `main` successfully, but Production remained on the previous commit because the Hobby deployment limit blocked the automatic production deployment.
- This documentation commit intentionally re-triggers the `main` deployment after the Pro upgrade so Production can catch up with the current branch.

## Expected production contents after redeploy

PR #288 adds:

- short native-app intro on every fresh app/WebView launch;
- faster native entry for already signed-in users (`/app` -> `/workspace` directly);
- a real monthly schedule calendar;
- Israeli holidays and memorial/holiday-eve labels inside the monthly calendar.

## Verification

After deployment, verify:

1. Vercel Production target is `READY` on the latest `main` commit.
2. `/api/health?deep=1` reports the same version/commit.
3. The schedule builder renders the monthly calendar without changing existing scheduling behavior.
4. Native-app cold launch shows the intro and signed-in users skip the login redirect.
