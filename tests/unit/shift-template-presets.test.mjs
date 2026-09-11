import assert from "node:assert/strict";
import test from "node:test";

import { BUSINESS_PRESETS } from "../../lib/shift-template-presets.ts";

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const SHIFT_TYPES = new Set(["opening", "middle", "closing", "custom"]);

test("every business preset has a unique key and at least one shift type", () => {
  const keys = BUSINESS_PRESETS.map((preset) => preset.key);
  assert.equal(new Set(keys).size, keys.length);
  for (const preset of BUSINESS_PRESETS) assert.ok(preset.templates.length > 0, preset.key);
});

test("preset shift types are valid, same-day and staffed", () => {
  for (const preset of BUSINESS_PRESETS) {
    const names = preset.templates.map((template) => template.name);
    assert.equal(new Set(names).size, names.length, `${preset.key}: duplicate shift name`);
    for (const template of preset.templates) {
      const where = `${preset.key}/${template.name}`;
      assert.match(template.startTime, TIME, where);
      assert.match(template.endTime, TIME, where);
      assert.ok(template.startTime < template.endTime, `${where}: must start before it ends, same day`);
      assert.ok(template.requiredEmployees >= 1, where);
      assert.ok(SHIFT_TYPES.has(template.shiftType), where);
    }
  }
});
