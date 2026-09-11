import assert from "node:assert/strict";
import test from "node:test";

import { planLimitMessage, planLimitResource } from "../../lib/plan-limit-errors.ts";

test("recognises each plan-limit error the database raises", () => {
  for (const resource of ["employee", "manager", "branch", "department"]) {
    assert.equal(planLimitResource({ message: `plan_limit:${resource}` }), resource);
    assert.ok(planLimitMessage({ message: `plan_limit:${resource}` })?.includes("מסלול"));
  }
});

test("works when Supabase wraps the message", () => {
  assert.equal(planLimitResource({ message: 'ERROR: plan_limit:employee (SQLSTATE P0001)' }), "employee");
});

test("ignores every other error", () => {
  assert.equal(planLimitMessage({ message: "User is already a member" }), null);
  assert.equal(planLimitMessage({ message: "plan_limit:employees" }), null);
  assert.equal(planLimitMessage({ message: "" }), null);
  assert.equal(planLimitMessage(null), null);
  assert.equal(planLimitMessage(undefined), null);
});
