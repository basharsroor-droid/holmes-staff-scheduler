import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import { sendEmail } from "@/lib/email/resend";
import { escapeHtml } from "@/lib/html";

export const dynamic = "force-dynamic";

// Public, unauthenticated lead capture. Before this existed the only "talk to
// us" route on the marketing site pointed at /support -- the internal,
// auth-gated support console -- so an anonymous prospect landed on a login
// screen. See docs/REMEDIATION_PLAN.md (H1).
const payloadSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(160),
  business: z.string().trim().max(120).optional().default(""),
  phone: z.string().trim().max(40).optional().default(""),
  teamSize: z.string().trim().max(40).optional().default(""),
  message: z.string().trim().min(5).max(2000),
  // Honeypot. Real browsers never fill it (it is hidden and aria-hidden);
  // naive bots fill every input they find.
  website: z.string().max(200).optional().default("")
}).strict();

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

// Best-effort flood control. Serverless instances are not shared, so this
// caps a single warm instance rather than the endpoint as a whole -- it stops
// a naive loop, not a distributed one. Deliberate: the durable fix is a
// provider-level rate limit, and this endpoint only sends mail to ourselves.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 3;
const recent = new Map<string, number[]>();

function rateLimited(key: string) {
  const now = Date.now();
  const hits = (recent.get(key) ?? []).filter((at) => now - at < WINDOW_MS);
  hits.push(now);
  recent.set(key, hits);
  if (recent.size > 500) {
    for (const [entryKey, entryHits] of recent) {
      if (entryHits.every((at) => now - at >= WINDOW_MS)) recent.delete(entryKey);
    }
  }
  return hits.length > MAX_PER_WINDOW;
}

function row(label: string, value: string) {
  if (!value) return "";
  return `<tr><td style="padding:6px 14px 6px 0;color:#66738b;white-space:nowrap">${escapeHtml(label)}</td><td style="padding:6px 0;color:#11203c"><strong>${escapeHtml(value)}</strong></td></tr>`;
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return NextResponse.json({ error: "Content-Type must be application/json" }, { status: 415 });
  }

  const rawBody = await request.text();
  if (rawBody.length > 8192) return NextResponse.json({ error: "Payload too large" }, { status: 413 });

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = payloadSchema.safeParse(parsedJson);
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const lead = parsed.data;

  // Answer a honeypot hit exactly like a success so a bot gets no signal.
  if (lead.website.trim()) return NextResponse.json({ ok: true });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const inbox = process.env.CONTACT_INBOX || "support@shiftpilothq.com";
  const html = `<div style="font-family:Arial,'Noto Sans Hebrew',sans-serif;direction:rtl;text-align:right">
    <h2 style="margin:0 0 16px;color:#11203c">פנייה חדשה מעמוד צור קשר</h2>
    <table style="border-collapse:collapse;font-size:14px">
      ${row("שם", lead.name)}
      ${row("מייל", lead.email)}
      ${row("עסק", lead.business)}
      ${row("טלפון", lead.phone)}
      ${row("גודל צוות", lead.teamSize)}
    </table>
    <p style="margin:18px 0 6px;color:#66738b;font-size:13px">ההודעה:</p>
    <p style="margin:0;padding:14px;border-radius:10px;background:#f4f7fc;color:#11203c;line-height:1.7;white-space:pre-wrap">${escapeHtml(lead.message)}</p>
  </div>`;

  try {
    await sendEmail({
      to: inbox,
      subject: `פנייה חדשה — ${lead.name}${lead.business ? ` (${lead.business})` : ""}`,
      html,
      idempotencyKey: `shiftpilot-contact-${randomUUID()}`
    });
  } catch {
    // Never surface provider internals to an anonymous caller. The form falls
    // back to showing the support mailbox so the lead is not lost.
    return NextResponse.json({ error: "send_failed" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
