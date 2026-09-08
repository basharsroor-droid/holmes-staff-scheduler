import assert from "node:assert/strict";
import test from "node:test";

import { pushCopy } from "../../lib/push/apns.ts";

test("push notification routes are limited to known application screens", () => {
  const cases = [
    ["schedule_published", "/workspace/my-shifts"],
    ["shift_assignment_changed", "/workspace/my-shifts"],
    ["shift_reminder", "/workspace/my-shifts"],
    ["availability_reminder", "/workspace/availability"],
    ["availability_closing", "/workspace/availability"],
    ["swap_approved", "/workspace/shift-swaps"],
    ["unknown", "/workspace/notifications"]
  ];
  for (const [template, route] of cases) assert.equal(pushCopy(template, {}).route, route);
});

test("push copy does not include arbitrary routes from notification payloads", () => {
  assert.equal(pushCopy("schedule_published", { route: "https://attacker.example" }).route, "/workspace/my-shifts");
});
