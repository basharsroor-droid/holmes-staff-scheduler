import { NextResponse } from "next/server";

import {
  DEMO_VERIFICATION_CODE,
  GOOGLE_USERS_SHEET_URL,
  registerUserSchema
} from "@/lib/auth-config";

async function appendToGoogleSheet(values: string[]) {
  const webhookUrl = process.env.GOOGLE_USERS_SHEET_WEBHOOK_URL;

  if (!webhookUrl) {
    return {
      synced: false,
      reason: "GOOGLE_USERS_SHEET_WEBHOOK_URL is not configured"
    };
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      spreadsheetUrl: GOOGLE_USERS_SHEET_URL,
      sheetName: "Sheet1",
      values
    })
  });

  if (!response.ok) {
    return {
      synced: false,
      reason: `Sheet webhook failed with ${response.status}`
    };
  }

  return { synced: true };
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = registerUserSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        errors: parsed.error.flatten().fieldErrors
      },
      { status: 400 }
    );
  }

  const user = parsed.data;
  const now = new Date().toISOString();
  const sheetResult = await appendToGoogleSheet([
    user.firstName,
    user.lastName,
    user.nationalId,
    "לא נשמר גלוי - יחובר hash",
    user.email,
    "ממתין אימות",
    "employee",
    now,
    "נרשם דרך האפליקציה",
    "MVP"
  ]);

  return NextResponse.json({
    ok: true,
    verificationCode: DEMO_VERIFICATION_CODE,
    sheet: sheetResult
  });
}
