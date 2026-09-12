import { NextResponse } from "next/server";

import { notificationEmail, renderEmail } from "@/lib/email/templates";
import { sendEmail } from "@/lib/email/resend";
import { pushCopy } from "@/lib/push/apns";
import { deadDeviceToken, isPlatformConfigured, sendPush } from "@/lib/push/dispatch";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { bearerMatches } from "@/lib/timing-safe";
import type { Json } from "@/types/database";

export const maxDuration = 60;

type QueueJob = { id: string; recipient: string; template_key: string; payload: Json; attempts: number };
type PushJob = {
  id: string;
  device_id: string;
  device_token: string;
  environment: "sandbox" | "production";
  platform: string;
  template_key: string;
  payload: Json;
  attempts: number;
};

function authorized(request: Request) {
  // Constant-time comparison (E5); false when CRON_SECRET is unset.
  return bearerMatches(request.headers.get("authorization"), process.env.CRON_SECRET);
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = createSupabaseAdminClient();
  const { error: purgeError } = await admin.rpc("purge_expired_operational_events");
  if (purgeError) return NextResponse.json({ error: "Could not purge expired operational events" }, { status: 500 });
  const { error: scheduleError } = await admin.rpc("enqueue_scheduled_notifications", { run_at: new Date().toISOString() });
  if (scheduleError) return NextResponse.json({ error: "Could not schedule notifications" }, { status: 500 });
  const { data, error } = await admin.rpc("claim_email_delivery_jobs", { batch_size: 25 });
  if (error) return NextResponse.json({ error: "Could not claim email jobs" }, { status: 500 });
  const { data: pushData, error: pushClaimError } = await admin.rpc("claim_push_delivery_jobs", { batch_size: 50 });
  if (pushClaimError) return NextResponse.json({ error: "Could not claim push jobs" }, { status: 500 });

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
  const pushResults = await Promise.allSettled(((pushData ?? []) as PushJob[]).map(async (job) => {
    try {
      const payload = job.payload && typeof job.payload === "object" && !Array.isArray(job.payload) ? job.payload as Record<string, unknown> : {};
      const copy = pushCopy(job.template_key, payload);
      // A platform with no credentials yet (Android before Firebase is set
      // up) must not burn retry attempts. claim_push_delivery_jobs already
      // marked this row 'processing' and counted an attempt, so hand it back
      // as 'pending' with the attempt undone -- otherwise it would sit locked
      // for 10 minutes, lose an attempt per tick and eventually be dropped.
      if (!isPlatformConfigured(job.platform)) {
        await admin
          .from("push_delivery_queue")
          .update({ status: "pending", attempts: Math.max(job.attempts - 1, 0), locked_at: null })
          .eq("id", job.id);
        return job.id;
      }
      const apnsId = await sendPush({
        platform: job.platform,
        token: job.device_token,
        environment: job.environment,
        ...copy
      });
      await admin.from("push_delivery_queue").update({
        status: "sent",
        sent_at: new Date().toISOString(),
        apns_id: apnsId,
        last_error: null
      }).eq("id", job.id);
      return job.id;
    } catch (sendError) {
      const errorMessage = sendError instanceof Error ? sendError.message.slice(0, 500) : "Unknown delivery error";
      const invalidToken = deadDeviceToken(errorMessage);
      const finalFailure = invalidToken || job.attempts >= 5;
      const delayMinutes = Math.min(2 ** Math.max(job.attempts, 1), 60);
      await admin.from("push_delivery_queue").update({
        status: finalFailure ? "failed" : "retry",
        scheduled_for: new Date(Date.now() + delayMinutes * 60_000).toISOString(),
        last_error: errorMessage
      }).eq("id", job.id);
      if (invalidToken) {
        await admin.from("push_devices").update({ active: false, updated_at: new Date().toISOString() }).eq("id", job.device_id);
      }
      throw sendError;
    }
  }));
  return NextResponse.json({
    email: { claimed: results.length, sent: results.filter((item) => item.status === "fulfilled").length, failed: results.filter((item) => item.status === "rejected").length },
    push: { claimed: pushResults.length, sent: pushResults.filter((item) => item.status === "fulfilled").length, failed: pushResults.filter((item) => item.status === "rejected").length }
  });
}
