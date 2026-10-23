const asyncHandler = require("../utils/asyncHandler");
const goalsService = require("../services/goalsService");

const getMyGoals = asyncHandler(async (req, res) => {
  const goals = await goalsService.getGoals(req.user._id);
  res.json({ goals });
});

const updateMyGoals = asyncHandler(async (req, res) => {
  const goals = await goalsService.upsertGoals(req.user._id, req.body);
  res.json({ goals });
});

module.exports = { getMyGoals, updateMyGoals };


