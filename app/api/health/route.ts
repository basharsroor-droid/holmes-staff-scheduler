import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseConfig, isSupabaseConfigured } from "@/lib/supabase/config";
import type { Database } from "@/types/database";

export const dynamic = "force-dynamic";

const noStoreHeaders = { "Cache-Control": "no-store, max-age=0" };

// The deployed commit, so the post-deploy smoke check in docs/RUNBOOK.md can
// confirm which build is actually serving traffic. Reported by both the shallow
// and the deep check -- the Runbook tells you to verify the commit via the deep
// call, which previously omitted it.
const deployedVersion = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local";

export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured) {
    return NextResponse.json(
      { status: "unavailable", service: "shiftpilot", version: deployedVersion },
      { status: 503, headers: noStoreHeaders }
    );
  }

  const deepCheck = request.nextUrl.searchParams.get("deep") === "1";
  if (!deepCheck) {
    return NextResponse.json(
      {
        status: "ok",
        service: "shiftpilot",
        version: deployedVersion
      },
      { headers: noStoreHeaders }
    );
  }

  try {
    const { supabaseUrl, supabasePublishableKey } = getSupabaseConfig();
    const supabase = createClient<Database>(supabaseUrl, supabasePublishableKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    const { error } = await supabase
      .from("organizations")
      .select("id", { count: "exact", head: true })
      .limit(1);

    if (error) throw error;

    return NextResponse.json(
      { status: "ok", service: "shiftpilot", version: deployedVersion, dependencies: { database: "ok" } },
      { headers: noStoreHeaders }
    );
  } catch {
    return NextResponse.json(
      { status: "degraded", service: "shiftpilot", version: deployedVersion, dependencies: { database: "unavailable" } },
      { status: 503, headers: noStoreHeaders }
    );
  }
}
