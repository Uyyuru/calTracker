const path = require("path");
const test = require("node:test");
const assert = require("node:assert/strict");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const mongoose = require("mongoose");
const User = require("../src/models/User");
const Meal = require("../src/models/mealModel");
const mealService = require("../src/services/mealService");
const reportService = require("../src/services/reportService");

const stamp = Date.now();
const password = "TestPass1!";
const zone = "Asia/Kolkata";

let userA;
let userB;

test.before(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  userA = await User.create({
    username: `microA${stamp}`.slice(0, 20),
    email: `micro-a-${stamp}@example.com`,
    password,
  });
  userB = await User.create({
    username: `microB${stamp}`.slice(0, 20),
    email: `micro-b-${stamp}@example.com`,
    password,
  });
});

test.after(async () => {
  const ids = [userA?._id, userB?._id].filter(Boolean);
  await Meal.deleteMany({ userId: { $in: ids } });
  await User.deleteMany({ _id: { $in: ids } });
  await mongoose.disconnect();
});

const baseMeal = (overrides = {}) => ({
  foodName: "Spinach",
  mealType: "lunch",
  quantity: 100,
  unit: "g",
  calories: 30,
  protein: 3,
  carbs: 4,
  fats: 0.4,
  consumedAt: "2026-10-23T08:00:00.000Z",
  micros: { iron: 2, calcium: 99, vitaminA: 469, vitaminC: 28, vitaminD: 0 },
  ...overrides,
});

test("meals persist, sum, edit, and delete micronutrients for one user", async () => {
  const created = await mealService.createMeal(userA._id, baseMeal());
  assert.equal(created.micros.iron, 2);
  assert.equal(created.micros.vitaminD, 0);
  assert.equal(created.micros.vitaminA, 469);

  const loaded = await mealService.getMealById(userA._id, created._id);
  assert.deepEqual(loaded.micros, created.micros);

  const second = await mealService.createMeal(
    userA._id,
    baseMeal({
      foodName: "Yogurt",
      micros: { iron: 1, calcium: 200, vitaminC: 2 },
      consumedAt: "2026-10-23T12:00:00.000Z",
    })
  );
  assert.equal(second.micros.vitaminA, null);
  assert.equal(second.micros.vitaminD, null);

  const day = { from: "2026-10-23", to: "2026-10-23", tz: zone };
  const summary = await reportService.micronutrientSummary(userA._id, day);
  assert.equal(summary.totals.iron, 3);
  assert.equal(summary.totals.calcium, 299);
  assert.equal(summary.totals.vitaminA, 469);
  assert.equal(summary.totals.vitaminC, 30);
  assert.equal(summary.totals.vitaminD, 0);
  assert.equal(summary.coverage.vitaminA.known, 1);
  assert.equal(summary.coverage.vitaminA.meals, 2);
  assert.equal(summary.coverage.vitaminD.known, 1);

  const otherDay = await reportService.micronutrientSummary(userA._id, {
    from: "2026-10-22",
    to: "2026-10-22",
    tz: zone,
  });
  assert.equal(otherDay.totals.iron, null);

  const hidden = await reportService.micronutrientSummary(userB._id, day);
  assert.equal(hidden.totals.iron, null);
  await assert.rejects(() => mealService.getMealById(userB._id, created._id), /Meal not found/);

  const updated = await mealService.updateMeal(userA._id, created._id, {
    micros: { iron: 4 },
  });
  assert.equal(updated.micros.iron, 4);
  assert.equal(updated.micros.calcium, 99);

  const afterEdit = await reportService.micronutrientSummary(userA._id, day);
  assert.equal(afterEdit.totals.iron, 5);

  await mealService.deleteMeal(userA._id, second._id);
  const afterDelete = await reportService.micronutrientSummary(userA._id, day);
  assert.equal(afterDelete.totals.iron, 4);
  assert.equal(afterDelete.totals.calcium, 99);
  assert.equal(afterDelete.coverage.vitaminC.known, 1);
  assert.equal(afterDelete.totals.vitaminD, 0);

  await assert.rejects(
    () => mealService.createMeal(userA._id, baseMeal({ micros: { iron: -2 } })),
    /non-negative/
  );
});
