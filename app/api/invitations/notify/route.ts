import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/supabase/config";
import type { Database } from "@/types/database";

// Sends the employee-invitation email via the Supabase Admin API.
//
// Why this has to run on the server: the client-side flow used to call
// supabase.auth.signInWithOtp() for the INVITEE's email from the MANAGER's
// own browser. With the PKCE flow @supabase/ssr uses by default, the code
// verifier is stored in a cookie in whichever browser started the request —
// the manager's, not the invitee's. When the invitee opens the email link on
// their own device there is no matching verifier, so the code exchange in
// /auth/callback always fails with "invalid flow state, flow state has
// expired". Admin-generated invite links do not have this problem: they are
// not tied to the browser that requested them.
export async function POST(request: Request) {
  let token: unknown;
  try {
    ({ token } = await request.json());
  } catch {
    token = undefined;
  }
  if (typeof token !== "string" || !token) {
    return NextResponse.json({ error: "Missing invitation token" }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  // RLS-scoped: only returns the invitation if the caller can see it
  // (i.e. is a member of the organization it belongs to).
  const { data: invitation, error: invitationError } = await supabase
    .from("organization_invitations")
    .select("email, status")
    .eq("token", token)
    .maybeSingle();

  if (invitationError || !invitation || invitation.status !== "pending") {
    return NextResponse.json({ error: "Invitation not found or not pending" }, { status: 404 });
  }

  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json({ error: "Server email is not configured" }, { status: 500 });
  }
  const { supabaseUrl } = getSupabaseConfig();
  const adminClient = createClient<Database>(supabaseUrl, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const origin = new URL(request.url).origin;
  const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(`/auth/accept-invite?token=${token}`)}`;

  const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(invitation.email, { redirectTo });

  if (inviteError) {
    const alreadyRegistered = /already.*regist/i.test(inviteError.message);
    return NextResponse.json(
      {
        error: alreadyRegistered
          ? "כתובת המייל כבר רשומה במערכת. בקש מהעובד להתחבר רגיל ואז לפתוח את קישור ההזמנה."
          : "לא הצלחנו לשלוח את מייל ההזמנה."
      },
      { status: alreadyRegistered ? 409 : 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
