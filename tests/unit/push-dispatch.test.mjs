import { test } from "node:test";
import assert from "node:assert/strict";

const { deadDeviceToken, isPlatformConfigured } = await import(new URL("../../lib/push/dispatch.ts", import.meta.url));

function withEnv(values, run) {
  const saved = {};
  for (const [key, value] of Object.entries(values)) {
    saved[key] = process.env[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    run();
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test("a platform counts as configured only when all of its credentials exist", () => {
  withEnv(
    { APNS_KEY_ID: "k", APNS_TEAM_ID: "t", APNS_PRIVATE_KEY: "p", FCM_PROJECT_ID: undefined, FCM_CLIENT_EMAIL: undefined, FCM_PRIVATE_KEY: undefined },
    () => {
      assert.equal(isPlatformConfigured("ios"), true);
      // Android before Firebase exists: not configured, so nothing is sent.
      assert.equal(isPlatformConfigured("android"), false);
    }
  );

  withEnv({ FCM_PROJECT_ID: "proj", FCM_CLIENT_EMAIL: "a@b.iam.gserviceaccount.com", FCM_PRIVATE_KEY: "key" }, () => {
    assert.equal(isPlatformConfigured("android"), true);
  });

  withEnv({ APNS_KEY_ID: undefined, APNS_TEAM_ID: undefined, APNS_PRIVATE_KEY: undefined }, () => {
    assert.equal(isPlatformConfigured("ios"), false);
  });
});

test("an unknown platform is treated as ios, never as configured-by-default", () => {
  withEnv({ APNS_KEY_ID: undefined, APNS_TEAM_ID: undefined, APNS_PRIVATE_KEY: undefined }, () => {
    assert.equal(isPlatformConfigured("windows"), false);
  });
});

test("only permanent provider errors retire a device token", () => {
  // APNs
  assert.equal(deadDeviceToken("APNs 400: BadDeviceToken"), true);
  assert.equal(deadDeviceToken("APNs 410: Unregistered"), true);
  assert.equal(deadDeviceToken("APNs 400: DeviceTokenNotForTopic"), true);
  // FCM
  assert.equal(deadDeviceToken("UNREGISTERED"), true);
  assert.equal(deadDeviceToken("INVALID_ARGUMENT"), true);
  assert.equal(deadDeviceToken("NOT_FOUND"), true);
  // Temporary failures must be retried, not retired.
  assert.equal(deadDeviceToken("APNs 503: service unavailable"), false);
  assert.equal(deadDeviceToken("UNAVAILABLE"), false);
  assert.equal(deadDeviceToken("INTERNAL"), false);
  assert.equal(deadDeviceToken("FCM auth returned 401"), false);
});
