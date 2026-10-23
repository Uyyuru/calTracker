const asyncHandler = require("../utils/asyncHandler");
const mealService = require("../services/mealService");

const create = asyncHandler(async (req, res) => {
  const meal = await mealService.createMeal(req.user._id, req.body);
  res.status(201).json({ meal });
});

const list = asyncHandler(async (req, res) => {
  const result = await mealService.listMeals(req.user._id, req.query);
  res.json(result);
});

const getOne = asyncHandler(async (req, res) => {
  const meal = await mealService.getMealById(req.user._id, req.params.id);
  res.json({ meal });
});

const update = asyncHandler(async (req, res) => {
  const meal = await mealService.updateMeal(req.user._id, req.params.id, req.body);
  res.json({ meal });
});

const remove = asyncHandler(async (req, res) => {
  await mealService.deleteMeal(req.user._id, req.params.id);
  res.json({ message: "Meal deleted" });
});

module.exports = { create, list, getOne, update, remove };
