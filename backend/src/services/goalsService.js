const UserGoals = require("../models/UserGoalsModel");

const DEFAULT_GOALS = {
  dailyCalories: 2000,
  dailyProtein: 150,
  dailyCarbs: 200,
  dailyFats: 50,
  weightGoal: 65,
};

const getGoals = async (userId) => {
  const existing = await UserGoals.findOne({ userId });
  if (existing) {
    return existing;
  }
  return UserGoals.create({ userId, ...DEFAULT_GOALS });
};

const upsertGoals = async (userId, body) => {
  const allowed = ["dailyCalories", "dailyProtein", "dailyCarbs", "dailyFats", "weightGoal"];
  const updates = {};
  allowed.forEach((field) => {
    if (body[field] !== undefined) {
      updates[field] = body[field];
    }
  });

  return UserGoals.findOneAndUpdate(
    { userId },
    { $set: updates, $setOnInsert: { userId } },
    { returnDocument: "after", upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );
};

module.exports = { getGoals, upsertGoals, DEFAULT_GOALS };
