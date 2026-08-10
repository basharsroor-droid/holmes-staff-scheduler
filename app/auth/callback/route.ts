import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

function safeNextPath(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/workspace";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNextPath(url.searchParams.get("next"));

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
    return NextResponse.redirect(new URL("/login?error=confirmation", url.origin));
  }

  // No PKCE `code`. Admin-generated links (auth.admin.inviteUserByEmail,
  // generateLink, etc.) go through Supabase's own /verify endpoint, which on
  // success redirects here with the session as an access_token/refresh_token
  // pair in the URL *hash fragment* -- a server route can never see that part
  // of the URL. Forward to `next` as-is: the browser carries the fragment
  // across this redirect, and the client-side Supabase SDK on that page
  // (detectSessionInUrl, on by default) picks the session up from there.
  // If there really is no session either way, the destination page's own
  // auth check (e.g. accept-invite's "invalid" state) surfaces that.
  return NextResponse.redirect(new URL(next, url.origin));
}
