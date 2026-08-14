import { NextResponse } from "next/server";

import { notificationEmail, renderEmail } from "@/lib/email/templates";
import { sendEmail } from "@/lib/email/resend";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/database";

export const maxDuration = 60;

type QueueJob = { id: string; recipient: string; template_key: string; payload: Json; attempts: number };

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret && request.headers.get("authorization") === `Bearer ${secret}`);
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = createSupabaseAdminClient();
  const { error: scheduleError } = await admin.rpc("enqueue_scheduled_notifications", { run_at: new Date().toISOString() });
  if (scheduleError) return NextResponse.json({ error: "Could not schedule notifications" }, { status: 500 });
  const { data, error } = await admin.rpc("claim_email_delivery_jobs", { batch_size: 25 });
  if (error) return NextResponse.json({ error: "Could not claim email jobs" }, { status: 500 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  const results = await Promise.allSettled(((data ?? []) as QueueJob[]).map(async (job) => {
    try {
      const payload = job.payload && typeof job.payload === "object" && !Array.isArray(job.payload) ? job.payload as Record<string, unknown> : {};
      const template = notificationEmail(job.template_key, payload, appUrl);
      const providerId = await sendEmail({ to: job.recipient, subject: template.subject, html: renderEmail(template, appUrl), idempotencyKey: `shiftpilot-${job.id}` });
      await admin.from("email_delivery_queue").update({ status: "sent", sent_at: new Date().toISOString(), provider_message_id: providerId, last_error: null }).eq("id", job.id);
      return job.id;
    } catch (sendError) {
      const finalFailure = job.attempts >= 5;
      const delayMinutes = Math.min(2 ** Math.max(job.attempts, 1), 60);
      await admin.from("email_delivery_queue").update({
        status: finalFailure ? "failed" : "retry",
        scheduled_for: new Date(Date.now() + delayMinutes * 60_000).toISOString(),
        last_error: sendError instanceof Error ? sendError.message.slice(0, 500) : "Unknown delivery error"
      }).eq("id", job.id);
      throw sendError;
    }
  }));
  return NextResponse.json({ claimed: results.length, sent: results.filter((item) => item.status === "fulfilled").length, failed: results.filter((item) => item.status === "rejected").length });
}
