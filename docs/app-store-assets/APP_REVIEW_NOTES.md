# App Review Notes — ShiftPilot 1.0

טיוטה להדבקה בשדה Notes for Review. יש להחליף את הסוגריים המרובעים בפרטי חשבונות
הבדיקה רק בתוך App Store Connect — אין לשמור סיסמאות במאגר.

## Review access

- Owner/manager account: `[APP_REVIEW_MANAGER_EMAIL]`
- Password: `[ENTER_ONLY_IN_APP_STORE_CONNECT]`
- Employee account: `[APP_REVIEW_EMPLOYEE_EMAIL]`
- Password: `[ENTER_ONLY_IN_APP_STORE_CONNECT]`
- No special hardware, location or VPN is required.
- The production backend will remain available throughout review.

## Suggested review path

1. Sign in with the manager account.
2. Open the workspace dashboard and review submission status.
3. Open the schedule builder and inspect the prepared monthly schedule.
4. Sign out and sign in with the employee account.
5. Open “My shifts”, inspect the upcoming shift and tap “Remind me one hour before”.
6. Open shift swaps to review the documented approval flow.
7. Account deletion is available from the in-app security settings and requires
   password reauthentication.

## Native iPhone functionality

ShiftPilot is an authenticated workforce scheduling service, not a marketing-site
wrapper. The iPhone build opens directly into the product login flow and provides a
native local-notification action on each future assigned shift. Permission is requested
only after the reviewer taps the reminder action. The reminder is scheduled on-device
for one hour before the shift and can be cancelled from the same screen. The regular
website does not expose this native action.

The app also provides role-scoped operational workflows: employees submit monthly
availability and manage shift swaps, while managers build and publish schedules. Demo
accounts use fictional data and are isolated from customer organizations.

## Other review details

- Primary language: Hebrew (RTL).
- App category: Business; secondary category: Productivity.
- There are no in-app purchases in version 1.0.
- Login uses ShiftPilot’s own email/password account system; no third-party social
  login is offered.
- Privacy policy: https://www.shiftpilothq.com/privacy
- Support: support@shiftpilothq.com
