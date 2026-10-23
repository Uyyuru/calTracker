const AppError = require("../utils/AppError");
const { getGeminiConfig } = require("./geminiClient");
const { toNumber, normalizeMicros } = require("./mealService");

const UNITS = ["g", "ml", "serving", "piece"];
const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"];

const parseJsonText = (text) => {
  const cleaned = String(text || "")
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "");
  return JSON.parse(cleaned);
};

const normalizeSuggestion = (raw = {}) => ({
  foodName: String(raw.foodName || "Unknown food").trim(),
  quantity: toNumber(raw.quantity, 1),
  unit: UNITS.includes(raw.unit) ? raw.unit : "serving",
  mealType: MEAL_TYPES.includes(String(raw.mealType || "").toLowerCase())
    ? String(raw.mealType).toLowerCase()
    : "snack",
  calories: toNumber(raw.calories, 0),
  protein: toNumber(raw.protein, 0),
  carbs: toNumber(raw.carbs, 0),
  fats: toNumber(raw.fats, 0),
  micros: normalizeMicros(raw.micros),
  source: "ai_photo",
});

const extractFromImage = async (file) => {
  if (!file) {
    throw new AppError("Image file is required", 400);
  }

  const { apiKey, model } = getGeminiConfig();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(30000),
      body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: "Read this food photo or nutrition label. Return only JSON with keys foodName, quantity, unit (g, ml, serving, or piece), mealType (breakfast, lunch, dinner, or snack), calories, protein, carbs, fats, and micros { iron, calcium, vitaminA, vitaminC, vitaminD }. Iron and calcium are mg, vitamin A is mcg RAE, vitamin C is mg, and vitamin D is mcg. Use null for any micronutrient that is not shown. Use 0 only when the label shows zero.",
            },
            {
              inline_data: {
                mime_type: file.mimetype,
                data: file.buffer.toString("base64"),
              },
            },
          ],
        },
      ],
      generationConfig: { responseMimeType: "application/json" },
    }),
  });
  } catch (error) {
    if (error.name === "TimeoutError" || error.name === "AbortError") {
      throw new AppError("Image analysis timed out", 504);
    }
    throw new AppError("Gemini request failed", 502);
  }

  const data = await response.json();
  if (!response.ok) {
    const message = data.error?.message || "Gemini request failed";
    throw new AppError(message, response.status === 400 ? 400 : 502);
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new AppError("Gemini did not return nutrition data", 502);
  }

  return { suggestion: normalizeSuggestion(parseJsonText(text)) };
};

module.exports = { extractFromImage };
