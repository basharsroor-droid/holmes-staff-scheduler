// The support_tickets column list, previously copy-pasted into four pages
// (F2). Kept as ONE string literal on purpose: supabase-js infers the row
// type from the literal passed to .select(), so splitting or joining it
// would silently turn the typed result into an untyped one.
export const SUPPORT_TICKET_COLUMNS =
  "id, organization_id, organization_name, created_by, category, priority, subject, description, status, resolution_note, assigned_to, created_at, updated_at, first_responded_at, resolved_at, reopened_count";
