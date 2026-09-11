import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

// Dedicated entry point for the wrapped Capacitor app. The native shell
// always starts here, never on the marketing homepage.
//
// Cold-launch performance: this route used to redirect unconditionally to
// /login, even when the WebView already had a valid Supabase session cookie.
// That forced an unnecessary extra navigation on every fresh app launch.
// Resolve the session once on the server and send signed-in users straight
// to their workspace; signed-out users keep the existing login-first flow.
export default async function NativeAppEntryPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  redirect(user ? "/workspace" : "/login");
}
