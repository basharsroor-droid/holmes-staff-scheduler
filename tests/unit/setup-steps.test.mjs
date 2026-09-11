import assert from "node:assert/strict";
import test from "node:test";

import { SETUP_STEPS } from "../../lib/setup-steps.ts";

test("the three setup steps are unique and point into the workspace", () => {
  assert.deepEqual(
    SETUP_STEPS.map((step) => step.key),
    ["shift-types", "work-month", "team"]
  );
  const hrefs = SETUP_STEPS.map((step) => step.href);
  assert.equal(new Set(hrefs).size, hrefs.length);
  for (const href of hrefs) assert.match(href, /^\/workspace\/[a-z-]+$/);
});

test("every step has a title, a description and 2-4 how-to lines", () => {
  for (const step of SETUP_STEPS) {
    assert.ok(step.title.trim().length > 0, step.key);
    assert.ok(step.description.trim().length > 0, step.key);
    assert.ok(step.howTo.length >= 2 && step.howTo.length <= 4, `${step.key}: ${step.howTo.length} lines`);
    assert.equal(new Set(step.howTo).size, step.howTo.length, `${step.key}: duplicate line`);
  }
});
