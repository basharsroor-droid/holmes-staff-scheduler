// One place that decides how a queued push is delivered, so the cron route
// stays platform-agnostic (app/api/cron/notifications/route.ts).
//
// iOS goes to APNs, Android to FCM. Both senders throw on failure with a
// provider-specific message; deadDeviceToken() recognises the strings that
// mean "this token will never work again", which is what tells the cron route
// to deactivate the device instead of retrying it for days.

import { sendApnsPush } from "./apns.ts";
import { isFcmConfigured, sendFcmPush } from "./fcm.ts";

export type PushPlatform = "ios" | "android";

export type DispatchInput = {
  platform: string;
  token: string;
  environment: "sandbox" | "production";
  title: string;
  body: string;
  route: string;
};

/** True when the platform can actually deliver right now. */
export function isPlatformConfigured(platform: string) {
  if (platform === "android") return isFcmConfigured();
  return !!process.env.APNS_KEY_ID && !!process.env.APNS_TEAM_ID && !!process.env.APNS_PRIVATE_KEY;
}

export async function sendPush(input: DispatchInput) {
  if (input.platform === "android") {
    return sendFcmPush({ token: input.token, title: input.title, body: input.body, route: input.route });
  }
  return sendApnsPush({
    token: input.token,
    environment: input.environment,
    title: input.title,
    body: input.body,
    route: input.route
  });
}

/**
 * Whether the provider is telling us the token is permanently gone: the app
 * was uninstalled, or the token was replaced. Anything else is treated as a
 * temporary failure and retried.
 */
export function deadDeviceToken(errorMessage: string) {
  return /BadDeviceToken|DeviceTokenNotForTopic|Unregistered|UNREGISTERED|INVALID_ARGUMENT|NOT_FOUND/.test(errorMessage);
}
