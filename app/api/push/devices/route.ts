import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const tokenPattern = /^[a-fA-F0-9]{32,256}$/;

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null) as { token?: unknown } | null;
  if (!body || typeof body.token !== "string" || !tokenPattern.test(body.token)) {
    return NextResponse.json({ error: "Invalid device token" }, { status: 400 });
  }

  const { data: membership } = await supabase
    .from("organization_memberships")
    .select("organization_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  if (!membership) return NextResponse.json({ error: "No active membership" }, { status: 403 });

  const admin = createSupabaseAdminClient();
  const token = body.token.toLowerCase();
  const configuredEnvironment = process.env.APNS_ENVIRONMENT === "sandbox" ? "sandbox" : "production";
  const { error } = await admin.from("push_devices").upsert({
    organization_id: membership.organization_id,
    user_id: user.id,
    token,
    platform: "ios",
    environment: configuredEnvironment,
    active: true,
    updated_at: new Date().toISOString(),
    last_seen_at: new Date().toISOString()
  }, { onConflict: "token" });
  if (error) return NextResponse.json({ error: "Could not register device" }, { status: 500 });
  return NextResponse.json({ registered: true });
}

export async function DELETE(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as { token?: unknown } | null;
  if (!body || typeof body.token !== "string" || !tokenPattern.test(body.token)) {
    return NextResponse.json({ error: "Invalid device token" }, { status: 400 });
  }
  const admin = createSupabaseAdminClient();
  await admin.from("push_devices").update({ active: false, updated_at: new Date().toISOString() })
    .eq("user_id", user.id).eq("token", body.token.toLowerCase());
  return NextResponse.json({ registered: false });
}
