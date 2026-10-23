const mongoose = require("mongoose");
const Meal = require("../models/mealModel");
const { parseDateRange, inclusiveDayCount, resolveTimeZone } = require("../utils/dateRange");
const { MICRO_FIELDS, MICRO_UNITS } = require("./mealService");
const { getGoals } = require("./goalsService");

const matchStage = (userId, query) => {
  const match = { userId: new mongoose.Types.ObjectId(userId) };
  const consumedAt = parseDateRange(query.from, query.to, query.tz);
  if (consumedAt) {
    match.consumedAt = consumedAt;
  }
  if (query.mealType) {
    match.mealType = query.mealType;
  }
  return match;
};

const dateFormat = (query, format) => ({
  format,
  date: "$consumedAt",
  timezone: resolveTimeZone(query.tz),
});

const weeklyCalorieTrend = async (userId, query) => {
  const match = matchStage(userId, query);
  const points = await Meal.aggregate([
    { $match: match },
    {
      $group: {
        _id: { $dateToString: dateFormat(query, "%Y-%m-%d") },
        calories: { $sum: "$calories" },
      },
    },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, date: "$_id", calories: 1 } },
  ]);
  return { points };
};

const macroBreakdown = async (userId, query) => {
  const groupBy = query.groupBy === "week" ? "week" : "day";
  const format = groupBy === "week" ? "%G-W%V" : "%Y-%m-%d";
  const match = matchStage(userId, query);

  const points = await Meal.aggregate([
    { $match: match },
    {
      $group: {
        _id: { $dateToString: dateFormat(query, format) },
        calories: { $sum: "$calories" },
        protein: { $sum: "$protein" },
        carbs: { $sum: "$carbs" },
        fats: { $sum: "$fats" },
      },
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        _id: 0,
        period: "$_id",
        calories: 1,
        protein: 1,
        carbs: 1,
        fats: 1,
      },
    },
  ]);

  return { groupBy, points };
};

// Missing nutrient values are excluded from the sum. A total is null when no meal
// in the range stored a number for that nutrient. A stored 0 is included.
const micronutrientSummary = async (userId, query) => {
  const match = matchStage(userId, query);
  const group = { _id: null, meals: { $sum: 1 } };
  MICRO_FIELDS.forEach((field) => {
    const path = `$micros.${field}`;
    group[field] = { $sum: { $cond: [{ $isNumber: path }, path, 0] } };
    group[`${field}Known`] = { $sum: { $cond: [{ $isNumber: path }, 1, 0] } };
  });

  const [row] = await Meal.aggregate([{ $match: match }, { $group: group }]);
  const meals = row?.meals || 0;
  const totals = {};
  const coverage = {};
  MICRO_FIELDS.forEach((field) => {
    const known = row?.[`${field}Known`] || 0;
    totals[field] = known === 0 ? null : row[field];
    coverage[field] = { known, meals, unit: MICRO_UNITS[field] };
  });

  return { totals, coverage, units: MICRO_UNITS };
};

const goalsVsActual = async (userId, query) => {
  const match = matchStage(userId, query);
  const days = inclusiveDayCount(query.from, query.to);
  const goals = await getGoals(userId);

  const [totals = { calories: 0, protein: 0, carbs: 0, fats: 0 }] = await Meal.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        calories: { $sum: "$calories" },
        protein: { $sum: "$protein" },
        carbs: { $sum: "$carbs" },
        fats: { $sum: "$fats" },
      },
    },
    { $project: { _id: 0, calories: 1, protein: 1, carbs: 1, fats: 1 } },
  ]);

  const compare = (actual, dailyTarget) => {
    const daily = Number(dailyTarget) || 0;
    const target = daily * days;
    const hasTarget = daily > 0;
    return {
      actual,
      target: hasTarget ? target : null,
      remaining: hasTarget ? target - actual : null,
      percent: hasTarget ? Math.round((actual / target) * 100) : null,
    };
  };

  return {
    days,
    goals,
    comparison: {
      calories: compare(totals.calories || 0, goals.dailyCalories),
      protein: compare(totals.protein || 0, goals.dailyProtein),
      carbs: compare(totals.carbs || 0, goals.dailyCarbs),
      fats: compare(totals.fats || 0, goals.dailyFats),
    },
  };
};

module.exports = {
  weeklyCalorieTrend,
  macroBreakdown,
  micronutrientSummary,
  goalsVsActual,
};
