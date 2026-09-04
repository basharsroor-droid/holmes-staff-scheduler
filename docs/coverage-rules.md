# Coverage Rules

Phase 1 Coverage Rules intentionally reuse existing scheduling configuration instead of adding a second rules model.

## Rules

- `required_employees` is the minimum staffing requirement for each shift.
- `requires_senior_employee` means at least one assigned worker must have a senior/lead/manager seniority marker.
- The Schedule Builder surfaces only coverage exceptions that need manager attention.
- Publishing an understaffed schedule still uses the existing manager confirmation.
- Publishing when a required senior is missing adds a separate Coverage Rules confirmation.
- Coverage Rules do not auto-assign workers and do not override manager decisions.

## Scope

This phase is a decision/validation layer only. It does not add payroll, skills matrices, role quotas, or automatic scheduling.
