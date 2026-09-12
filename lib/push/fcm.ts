// Android push, through Firebase Cloud Messaging HTTP v1.
//
// Mirrors lib/push/apns.ts: same message shape in, a provider message id out,
// and it throws on failure so the cron route's retry/deactivate logic is
// identical for both platforms.
//
// Credentials come from a Firebase service account, as three server-only
// variables (never NEXT_PUBLIC_*):
//   FCM_PROJECT_ID, FCM_CLIENT_EMAIL, FCM_PRIVATE_KEY
// Until they are set, isFcmConfigured() is false and nothing is sent -- the
// same "disabled by default" stance as the billing provider, so an Android
// build can ship before Firebase exists without breaking iPhone delivery.

import { createSign } from "node:crypto";

type FcmMessage = {
  token: string;
  title: string;
  body: string;
  route: string;
};

type ServiceAccount = { projectId: string; clientEmail: string; privateKey: string };

let cachedAccessToken: { value: string; expiresAt: number } | null = null;

function serviceAccount(): ServiceAccount | null {
  const projectId = process.env.FCM_PROJECT_ID;
  const clientEmail = process.env.FCM_CLIENT_EMAIL;
  const privateKey = process.env.FCM_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) return null;
  return { projectId, clientEmail, privateKey };
}

export function isFcmConfigured() {
  return serviceAccount() !== null;
}

function base64url(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

/** OAuth access token for the FCM scope, signed with the service account key. */
async function accessToken(account: ServiceAccount) {
  const now = Math.floor(Date.now() / 1000);
  if (cachedAccessToken && cachedAccessToken.expiresAt > now + 60) return cachedAccessToken.value;

  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(
    JSON.stringify({
      iss: account.clientEmail,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600
    })
  );
  const signingInput = `${header}.${claims}`;
  const signature = base64url(createSign("RSA-SHA256").update(signingInput).end().sign(account.privateKey));

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${signingInput}.${signature}`
    })
  });
  const body = (await response.json()) as { access_token?: string; expires_in?: number; error_description?: string };
  if (!response.ok || !body.access_token) {
    throw new Error(body.error_description || `FCM auth returned ${response.status}`);
  }

  cachedAccessToken = { value: body.access_token, expiresAt: now + (body.expires_in ?? 3600) };
  return body.access_token;
}

export async function sendFcmPush(message: FcmMessage) {
  const account = serviceAccount();
  if (!account) throw new Error("FCM credentials are not configured");

  const token = await accessToken(account);
  const response = await fetch(`https://fcm.googleapis.com/v1/projects/${account.projectId}/messages:send`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      message: {
        token: message.token,
        notification: { title: message.title, body: message.body },
        // Capacitor reads `route` from the data payload when the user taps.
        data: { route: message.route },
        android: { priority: "HIGH", notification: { sound: "default" } }
      }
    })
  });

  const body = (await response.json()) as { name?: string; error?: { message?: string; status?: string } };
  if (!response.ok || !body.name) {
    // The status string matters: dispatch.ts treats UNREGISTERED and
    // INVALID_ARGUMENT as a dead token, exactly like APNs BadDeviceToken.
    throw new Error(body.error?.status || body.error?.message || `FCM returned ${response.status}`);
  }
  return body.name;
}
