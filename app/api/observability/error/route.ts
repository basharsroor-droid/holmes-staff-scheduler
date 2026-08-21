import { createHash } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import { sendEmail } from "@/lib/email/resend";
import { sanitizeErrorMessage, sanitizeRoute } from "@/lib/observability";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const payloadSchema = z.object({
  name: z.string().trim().min(1).max(80),
  message: z.string().max(1000),
  digest: z.string().max(100).optional(),
  route: z.string().max(250),
  source: z.enum(["route-boundary", "global-boundary", "window-error", "unhandled-rejection"])
}).strict();

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
}

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return NextResponse.json({ error: "Content-Type must be application/json" }, { status: 415 });
  }

  const rawBody = await request.text();
  if (rawBody.length > 4096) return NextResponse.json({ error: "Payload too large" }, { status: 413 });

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = payloadSchema.safeParse(parsedJson);
  if (!parsed.success) return NextResponse.json({ error: "Invalid error report" }, { status: 400 });

  const message = sanitizeErrorMessage(parsed.data.message);
  const route = sanitizeRoute(parsed.data.route);
  const fingerprint = createHash("sha256")
    .update(`${parsed.data.name}:${message}:${route}`)
    .digest("hex")
    .slice(0, 32);

  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: membership } = user
      ? await supabase.from("organization_memberships")
          .select("organization_id")
          .eq("user_id", user.id)
          .eq("status", "active")
          .limit(1)
          .maybeSingle()
      : { data: null };

    const admin = createSupabaseAdminClient();
    const createdAt = new Date().toISOString();
    const { error } = await admin.from("operational_events").insert({
      event_type: "error",
      event_name: "client_exception",
      severity: "error",
      organization_id: membership?.organization_id ?? null,
      actor_user_id: user?.id ?? null,
      route,
      release: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 40) ?? "local",
      fingerprint,
      metadata: {
        error_name: parsed.data.name,
        message,
        digest: parsed.data.digest ?? null,
        source: parsed.data.source
      }
    });
    if (error) throw error;

    const windowStart = new Date(Date.now() - 15 * 60_000).toISOString();
    const { count } = await admin.from("operational_events")
      .select("id", { count: "exact", head: true })
      .eq("event_type", "error")
      .eq("fingerprint", fingerprint)
      .gte("created_at", windowStart)
      .lte("created_at", createdAt);

    if ((count ?? 0) <= 1) {
      const alertTo = process.env.OBSERVABILITY_ALERT_EMAIL ?? "support@shiftpilothq.com";
      await sendEmail({
        to: alertTo,
        subject: `[ShiftPilot] תקלה חדשה ב-${route}`,
        idempotencyKey: `operational-error-${fingerprint}-${Math.floor(Date.now() / 900_000)}`,
        html: `<div dir="rtl" style="font-family:Arial,sans-serif"><h1>זוהתה תקלה חדשה</h1><p><strong>עמוד:</strong> ${escapeHtml(route)}</p><p><strong>גרסה:</strong> ${escapeHtml(process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local")}</p><p><strong>סוג:</strong> ${escapeHtml(parsed.data.name)}</p><p><strong>הודעה מסוננת:</strong> ${escapeHtml(message)}</p><p><strong>מזהה:</strong> ${fingerprint}</p></div>`
      }).catch((alertError) => console.error("Operational alert email failed", alertError));
    }

    return NextResponse.json({ accepted: true }, { status: 202 });
  } catch (error) {
    console.error("Could not persist operational error", error);
    return NextResponse.json({ accepted: false }, { status: 503 });
  }
}
