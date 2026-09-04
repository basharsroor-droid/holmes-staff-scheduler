# Calendar Sync

Phase 1 Calendar Sync uses standards-based `.ics` export from **My Shifts**.

## Behavior

- Only published shifts already assigned to the signed-in employee are available for export.
- Employees can export one shift or all visible shifts for the selected published period.
- Calendar events use the `Asia/Jerusalem` timezone.
- Overnight shifts end on the following calendar day.
- Events include the shift name, branch, and manager note when present.
- Stable event UIDs are derived from the ShiftPilot shift id.
- No Google/Apple OAuth integration is required for Phase 1.
- No database migration or new permissions are required.

This keeps Calendar Sync provider-neutral and mobile-friendly while preserving the existing RLS-backed My Shifts data flow.
