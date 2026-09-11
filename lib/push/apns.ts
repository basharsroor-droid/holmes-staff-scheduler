import { createSign } from "node:crypto";
import { connect } from "node:http2";

import { assertOutboundAllowed } from "../outbound.ts";

type PushMessage = {
  token: string;
  environment: "sandbox" | "production";
  title: string;
  body: string;
  route: string;
};

let cachedProviderToken: { value: string; expiresAt: number } | null = null;

function base64url(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

function providerToken() {
  const now = Math.floor(Date.now() / 1000);
  if (cachedProviderToken && cachedProviderToken.expiresAt > now) return cachedProviderToken.value;

  const keyId = process.env.APNS_KEY_ID;
  const teamId = process.env.APNS_TEAM_ID;
  const privateKey = process.env.APNS_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!keyId || !teamId || !privateKey) throw new Error("APNs credentials are not configured");

  const header = base64url(JSON.stringify({ alg: "ES256", kid: keyId }));
  const claims = base64url(JSON.stringify({ iss: teamId, iat: now }));
  const signingInput = `${header}.${claims}`;
  const signature = createSign("SHA256")
    .update(signingInput)
    .end()
    .sign({ key: privateKey, dsaEncoding: "ieee-p1363" });
  const value = `${signingInput}.${base64url(signature)}`;
  cachedProviderToken = { value, expiresAt: now + 50 * 60 };
  return value;
}

export async function sendApnsPush(message: PushMessage) {
  assertOutboundAllowed(message.token);
  const bundleId = process.env.APNS_BUNDLE_ID || "com.shiftpilothq.app";
  const origin = message.environment === "sandbox"
    ? "https://api.sandbox.push.apple.com"
    : "https://api.push.apple.com";
  const client = connect(origin);

  return new Promise<string>((resolve, reject) => {
    let responseBody = "";
    const request = client.request({
      ":method": "POST",
      ":path": `/3/device/${encodeURIComponent(message.token)}`,
      authorization: `bearer ${providerToken()}`,
      "apns-topic": bundleId,
      "apns-push-type": "alert",
      "apns-priority": "10",
      "content-type": "application/json"
    });

    request.setEncoding("utf8");
    request.on("response", (headers) => {
      const status = Number(headers[":status"] ?? 500);
      const apnsId = String(headers["apns-id"] ?? "");
      request.on("data", (chunk) => { responseBody += chunk; });
      request.on("end", () => {
        client.close();
        if (status === 200) resolve(apnsId);
        else reject(new Error(`APNs ${status}: ${responseBody || "delivery rejected"}`));
      });
    });
    request.on("error", (error) => {
      client.close();
      reject(error);
    });
    request.end(JSON.stringify({
      aps: {
        alert: { title: message.title, body: message.body },
        sound: "default"
      },
      route: message.route
    }));
  });
}

export function pushCopy(templateKey: string, payload: Record<string, unknown>) {
  const shift = typeof payload.name === "string" ? payload.name : "המשמרת";
  if (templateKey === "schedule_published") return { title: "סידור העבודה פורסם", body: "הסידור החדש זמין לצפייה.", route: "/workspace/my-shifts" };
  if (templateKey === "shift_assignment_changed") return { title: "השיבוץ שלך עודכן", body: `בוצע שינוי ב${shift}.`, route: "/workspace/my-shifts" };
  if (templateKey === "shift_reminder") return { title: "המשמרת מתחילה בעוד כשעה", body: shift, route: "/workspace/my-shifts" };
  if (templateKey === "availability_reminder") return { title: "תזכורת להגשת זמינות", body: "חלון ההגשה עומד להיסגר.", route: "/workspace/availability" };
  if (templateKey === "availability_closing") return { title: "הגשת הזמינות נסגרת היום", body: "מומלץ להשלים את ההגשה עכשיו.", route: "/workspace/availability" };
  if (templateKey.startsWith("swap_")) return { title: "עדכון בהחלפת משמרת", body: "יש עדכון חדש בבקשת ההחלפה.", route: "/workspace/shift-swaps" };
  return { title: "עדכון חדש מ־ShiftPilot", body: "יש עדכון חדש במערכת.", route: "/workspace/notifications" };
}
