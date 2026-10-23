const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeMicros } = require("../src/services/mealService");
const { parseDateRange, inclusiveDayCount } = require("../src/utils/dateRange");

test("missing micronutrients stay null and an entered zero stays zero", () => {
  const created = normalizeMicros({ iron: 2.5, calcium: 0 });
  assert.equal(created.iron, 2.5);
  assert.equal(created.calcium, 0);
  assert.equal(created.vitaminA, null);
  assert.equal(created.vitaminC, null);
  assert.equal(created.vitaminD, null);
});

test("partial micronutrient updates omit keys that were not sent", () => {
  const patch = normalizeMicros({ vitaminC: 12 }, { partial: true });
  assert.deepEqual(patch, { vitaminC: 12 });
});

test("negative and non-finite micronutrients are rejected", () => {
  assert.throws(() => normalizeMicros({ iron: -1 }), /non-negative/);
  assert.throws(() => normalizeMicros({ calcium: Number.POSITIVE_INFINITY }), /finite/);
  assert.throws(() => normalizeMicros({ vitaminD: "nope" }), /finite/);
});

test("a date-only range uses the requested timezone", () => {
  const range = parseDateRange("2026-10-23", "2026-10-23", "Asia/Kolkata");
  assert.equal(range.$gte.toISOString(), "2026-10-22T18:30:00.000Z");
  assert.equal(range.$lte.toISOString(), "2026-10-23T18:29:59.999Z");
});

test("inclusive day count uses calendar dates", () => {
  assert.equal(inclusiveDayCount("2026-10-17", "2026-10-23"), 7);
  assert.equal(inclusiveDayCount("2026-10-23", "2026-10-23"), 1);
});
