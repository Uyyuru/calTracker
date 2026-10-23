const Meal = require("../models/mealModel");
const AppError = require("../utils/AppError");
const { parseDateRange } = require("../utils/dateRange");
const { parsePagination, paginated } = require("../utils/pagination");
const uploadService = require("./uploadService");

const NUTRIENT_FIELDS = ["calories", "protein", "carbs", "fats"];
const MICRO_FIELDS = ["iron", "calcium", "vitaminA", "vitaminC", "vitaminD"];
const MICRO_UNITS = {
  iron: "mg",
  calcium: "mg",
  vitaminA: "mcg RAE",
  vitaminC: "mg",
  vitaminD: "mcg",
};

const toNumber = (value, fallback = 0) => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const requireNumber = (value, label) => {
  if (value === undefined || value === null || value === "") {
    throw new AppError(`${label} is required`, 400);
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new AppError(`${label} must be a finite number`, 400);
  }
  if (parsed < 0) {
    throw new AppError(`${label} cannot be negative`, 400);
  }
  return parsed;
};

// Blank or omitted micronutrients stay null. A stored 0 is a real measurement.
const readMicroValue = (value, field) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new AppError(`${field} must be a finite, non-negative number`, 400);
  }
  return parsed;
};

const normalizeMicros = (micros, { partial = false } = {}) => {
  const source = micros && typeof micros === "object" && !Array.isArray(micros) ? micros : {};
  return MICRO_FIELDS.reduce((acc, field) => {
    const present = Object.prototype.hasOwnProperty.call(source, field);
    if (!present) {
      if (!partial) {
        acc[field] = null;
      }
      return acc;
    }
    acc[field] = readMicroValue(source[field], field);
    return acc;
  }, {});
};

const microsFromMeal = (meal) => {
  const current = typeof meal.micros?.toObject === "function" ? meal.micros.toObject() : meal.micros || {};
  return MICRO_FIELDS.reduce((acc, field) => {
    acc[field] = current[field] === undefined ? null : current[field];
    return acc;
  }, {});
};

const buildMealPayload = (body, extras = {}) => {
  const payload = {
    mealType: body.mealType,
    foodName: body.foodName,
    quantity: requireNumber(body.quantity, "Quantity"),
    unit: body.unit || "serving",
    calories: requireNumber(body.calories, "Calories"),
    protein: requireNumber(body.protein, "Protein"),
    carbs: requireNumber(body.carbs, "Carbs"),
    fats: requireNumber(body.fats, "Fats"),
    micros: normalizeMicros(body.micros),
    source: body.source || extras.source || "manual",
  };

  if (body.consumedAt) {
    payload.consumedAt = new Date(body.consumedAt);
  }
  if (body.originalText || extras.originalText) {
    payload.originalText = body.originalText || extras.originalText;
  }

  return payload;
};

const presentMeal = (meal) => {
  const item = meal.toObject ? meal.toObject() : { ...meal };
  item.micros = microsFromMeal(item);
  if (item.imagePublicId) {
    item.imageUrl = uploadService.signedUrl(item.imagePublicId, item.imageResourceType || "image");
  }
  return item;
};

const attachImage = (payload, userId, body) => {
  if (!body.imagePublicId) {
    return;
  }
  uploadService.assertOwned(userId, body.imagePublicId);
  payload.imagePublicId = body.imagePublicId;
  payload.imageResourceType = body.imageResourceType || "image";
  payload.imageUrl = uploadService.signedUrl(payload.imagePublicId, payload.imageResourceType);
};

const removeUnsavedImage = async (userId, publicId, resourceType) => {
  if (!publicId) {
    return;
  }
  const existing = await Meal.findOne({ userId, imagePublicId: publicId });
  if (!existing) {
    await uploadService.destroyIfOwned(userId, publicId, resourceType || "image");
  }
};

const assertOwner = (meal, userId) => {
  if (!meal || String(meal.userId) !== String(userId)) {
    throw new AppError("Meal not found", 404);
  }
};

const createMeal = async (userId, body, extras = {}) => {
  const payload = buildMealPayload(body, extras);
  attachImage(payload, userId, body);
  try {
    const meal = await Meal.create({ userId, ...payload });
    return presentMeal(meal);
  } catch (error) {
    await removeUnsavedImage(userId, payload.imagePublicId, payload.imageResourceType);
    throw error;
  }
};

const listMeals = async (userId, query) => {
  const { page, limit, skip } = parsePagination(query);
  const filter = { userId };

  const consumedAt = parseDateRange(query.from, query.to, query.tz);
  if (consumedAt) {
    filter.consumedAt = consumedAt;
  }
  if (query.mealType) {
    filter.mealType = query.mealType;
  }

  const [items, total] = await Promise.all([
    Meal.find(filter).sort({ consumedAt: -1 }).skip(skip).limit(limit),
    Meal.countDocuments(filter),
  ]);

  return paginated({ items: items.map(presentMeal), total, page, limit });
};

const getMealById = async (userId, id) => {
  const meal = await Meal.findById(id);
  assertOwner(meal, userId);
  return presentMeal(meal);
};

const updateMeal = async (userId, id, body) => {
  const meal = await Meal.findById(id);
  assertOwner(meal, userId);

  const previousPublicId = meal.imagePublicId;
  const previousResourceType = meal.imageResourceType;
  const updates = {};
  ["mealType", "foodName", "unit", "source", "originalText"].forEach((field) => {
    if (body[field] !== undefined) {
      updates[field] = body[field];
    }
  });
  if (body.imagePublicId && body.imagePublicId !== previousPublicId) {
    attachImage(updates, userId, body);
  }
  if (body.quantity !== undefined) {
    updates.quantity = requireNumber(body.quantity, "Quantity");
  }
  const labels = { calories: "Calories", protein: "Protein", carbs: "Carbs", fats: "Fats" };
  NUTRIENT_FIELDS.forEach((field) => {
    if (body[field] !== undefined) {
      updates[field] = requireNumber(body[field], labels[field]);
    }
  });
  if (body.micros && typeof body.micros === "object" && !Array.isArray(body.micros)) {
    updates.micros = { ...microsFromMeal(meal), ...normalizeMicros(body.micros, { partial: true }) };
  }
  if (body.consumedAt) {
    updates.consumedAt = new Date(body.consumedAt);
  }

  Object.assign(meal, updates);
  try {
    await meal.save();
  } catch (error) {
    if (updates.imagePublicId && updates.imagePublicId !== previousPublicId) {
      await removeUnsavedImage(userId, updates.imagePublicId, updates.imageResourceType);
    }
    throw error;
  }

  if (previousPublicId && previousPublicId !== meal.imagePublicId) {
    await uploadService.destroyIfOwned(userId, previousPublicId, previousResourceType || "image");
  }
  return presentMeal(meal);
};

const deleteMeal = async (userId, id) => {
  const meal = await Meal.findById(id);
  assertOwner(meal, userId);
  const publicId = meal.imagePublicId;
  const resourceType = meal.imageResourceType;
  await meal.deleteOne();
  if (publicId) {
    try {
      await uploadService.destroyIfOwned(userId, publicId, resourceType || "image");
    } catch (error) {
      console.error("Could not delete stored image");
    }
  }
  return meal;
};

module.exports = {
  MICRO_FIELDS,
  MICRO_UNITS,
  createMeal,
  listMeals,
  getMealById,
  updateMeal,
  deleteMeal,
  normalizeMicros,
  toNumber,
  requireNumber,
};


