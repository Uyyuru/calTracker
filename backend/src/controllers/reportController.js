const asyncHandler = require("../utils/asyncHandler");
const reportService = require("../services/reportService");

const weekly = asyncHandler(async (req, res) => {
  const data = await reportService.weeklyCalorieTrend(req.user._id, req.query);
  res.json(data);
});

const macros = asyncHandler(async (req, res) => {
  const data = await reportService.macroBreakdown(req.user._id, req.query);
  res.json(data);
});

const micros = asyncHandler(async (req, res) => {
  const data = await reportService.micronutrientSummary(req.user._id, req.query);
  res.json(data);
});

const goalsVsActual = asyncHandler(async (req, res) => {
  const data = await reportService.goalsVsActual(req.user._id, req.query);
  res.json(data);
});

module.exports = { weekly, macros, micros, goalsVsActual };
