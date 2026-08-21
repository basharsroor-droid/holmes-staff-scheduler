import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Self-service account deletion, required by App Store guideline 5.1.1(v):
// an app that lets people create an account (here: /onboarding, which calls
// auth.signUp) has to let them delete it from inside the app, not by emailing
// support.
//
// Why this lives in a route instead of an RPC: removing the row from
// auth.users is what actually deletes the account, and that needs the service
// key -- the browser client cannot do it, and neither can a SECURITY DEFINER
// function reachable from the client without handing it far more reach than
// deleting one's own account needs. Same shape as
// app/api/invitations/notify/route.ts: authenticate with the caller's own
// session first, and only then reach for the admin client, scoped by hand to
// the authenticated user's id.
//
// Once auth.users loses the row the database does the rest on its own: the
// schema already cascades the personal data (profiles, memberships,
// availability submissions, shift assignments, notifications) and nulls the
// actor on the records a business has to keep (audit_logs.actor_user_id,
// shift_assignments.assigned_by, swap decisions). So there is no field-by-
// field scrub to maintain here -- one delete, and the FKs express the policy.

type OrphanedOrganization = { id: string; name: string; memberCount: number };
type DemoOrganization = { id: string; name: string };

// Demo credentials are intentionally handed to reviewers and prospects. Even
// though they authenticate like normal accounts, they must never be able to
// destroy the shared demo tenant or delete one of its seeded identities.
async function findDemoOrganizations(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  userId: string
): Promise<DemoOrganization[]> {
  const { data: memberships, error: membershipsError } = await admin
    .from("organization_memberships")
    .select("organization_id")
    .eq("user_id", userId);

  if (membershipsError) throw new Error(membershipsError.message);
  const organizationIds = [...new Set((memberships ?? []).map(({ organization_id }) => organization_id))];
  if (!organizationIds.length) return [];

  const { data: organizations, error: organizationsError } = await admin
    .from("organizations")
    .select("id, name")
    .in("id", organizationIds)
    .eq("is_demo", true);

  if (organizationsError) throw new Error(organizationsError.message);
  return organizations ?? [];
}

// An organization whose only active owner is the caller. Deleting just the
// account would leave it with nobody able to manage it, so it has to go too --
// but only after the caller is told about it by name and agrees.
async function findOrphanedOrganizations(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  userId: string
): Promise<OrphanedOrganization[]> {
  const { data: ownerships, error } = await admin
    .from("organization_memberships")
    .select("organization_id")
    .eq("user_id", userId)
    .eq("role", "owner")
    .eq("status", "active");

  if (error) throw new Error(error.message);
  if (!ownerships?.length) return [];

  const orphaned: OrphanedOrganization[] = [];

  for (const { organization_id: organizationId } of ownerships) {
    const { count: otherOwners, error: ownersError } = await admin
      .from("organization_memberships")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("role", "owner")
      .eq("status", "active")
      .neq("user_id", userId);

    if (ownersError) throw new Error(ownersError.message);
    if (otherOwners) continue; // someone else can still run this business

    const [{ data: organization }, { count: memberCount }] = await Promise.all([
      admin.from("organizations").select("name").eq("id", organizationId).maybeSingle(),
      admin
        .from("organization_memberships")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .neq("user_id", userId)
    ]);

    orphaned.push({
      id: organizationId,
      name: organization?.name ?? "",
      memberCount: memberCount ?? 0
    });
  }

  return orphaned;
}

// Lets the UI warn about the real consequences before anything is typed --
// which businesses disappear, and how many people lose access with them.
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  try {
    const admin = createSupabaseAdminClient();
    const [organizationsToDelete, demoOrganizations] = await Promise.all([
      findOrphanedOrganizations(admin, user.id),
      findDemoOrganizations(admin, user.id)
    ]);
    return NextResponse.json({
      email: user.email ?? "",
      organizationsToDelete,
      deletionBlocked: demoOrganizations.length > 0
    });
  } catch {
    return NextResponse.json({ error: "Could not load account details" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: { confirmation?: unknown; acknowledgeOrganizations?: unknown };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  // Typing the account's own email is the confirmation. It cannot be produced
  // by a stray click or a double-submit, and unlike a generic "yes" it proves
  // the person knows which account they are on -- which matters here, because
  // a manager and an employee can be signed in on the same shared device.
  const confirmation = typeof body.confirmation === "string" ? body.confirmation.trim() : "";
  if (!user.email || confirmation.toLowerCase() !== user.email.toLowerCase()) {
    return NextResponse.json({ error: "Confirmation does not match the account email" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  try {
    if ((await findDemoOrganizations(admin, user.id)).length) {
      return NextResponse.json(
        { error: "Demo accounts cannot be deleted" },
        { status: 403 }
      );
    }
  } catch {
    return NextResponse.json({ error: "Could not verify account protections" }, { status: 500 });
  }

  let orphaned: OrphanedOrganization[];
  try {
    orphaned = await findOrphanedOrganizations(admin, user.id);
  } catch {
    return NextResponse.json({ error: "Could not verify account ownership" }, { status: 500 });
  }

  // Deleting a business is a much bigger act than deleting a personal login,
  // so it needs its own explicit yes -- the client only sends this after
  // showing the businesses by name.
  if (orphaned.length && body.acknowledgeOrganizations !== true) {
    return NextResponse.json(
      { error: "Organization deletion not acknowledged", organizationsToDelete: orphaned },
      { status: 409 }
    );
  }

  // Leave a trace in the businesses that survive (the ones where this person
  // was an employee or a non-sole owner) so their records still explain why a
  // member vanished from past schedules. Deliberately no name, email, or phone
  // in the metadata: this row outlives the account, and re-recording the
  // personal data here would undo the deletion it is describing.
  const { data: survivingMemberships } = await admin
    .from("organization_memberships")
    .select("id, organization_id, role")
    .eq("user_id", user.id)
    .not("organization_id", "in", `(${orphaned.map((organization) => organization.id).join(",") || "00000000-0000-0000-0000-000000000000"})`);

  if (survivingMemberships?.length) {
    await admin.from("audit_logs").insert(
      survivingMemberships.map((membership) => ({
        organization_id: membership.organization_id,
        actor_user_id: user.id,
        action: "account.self_deleted",
        entity_type: "membership",
        entity_id: membership.id,
        metadata: { role: membership.role }
      }))
    );
  }

  // Organizations first: their memberships cascade away with them, and the
  // last-active-owner guard is written to stand aside for exactly that case
  // (see 20260820110000_allow_account_and_organization_deletion.sql). Doing it
  // in the other order would delete the user, cascade the owner membership on
  // its own, and trip the guard.
  for (const organization of orphaned) {
    const { error: organizationError } = await admin
      .from("organizations")
      .delete()
      .eq("id", organization.id);

    if (organizationError) {
      return NextResponse.json(
        { error: `Could not delete organization: ${organizationError.message}` },
        { status: 500 }
      );
    }
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    return NextResponse.json({ error: `Could not delete account: ${deleteError.message}` }, { status: 500 });
  }

  // The session's cookies now point at a user that no longer exists; clearing
  // them here means the browser is not left holding a token for a deleted
  // account until it happens to expire.
  await supabase.auth.signOut();

  return NextResponse.json({ ok: true, deletedOrganizations: orphaned.map((organization) => organization.name) });
}
