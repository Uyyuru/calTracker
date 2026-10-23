const AppError = require("../utils/AppError");

const isPlaceholder = (value) => !value || String(value).startsWith("your_");

const getGeminiConfig = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL;

  if (isPlaceholder(apiKey)) {
    throw new AppError("GEMINI_API_KEY is not set in backend/.env", 503);
  }
  if (isPlaceholder(model)) {
    throw new AppError("GEMINI_MODEL is not set in backend/.env", 503);
  }

  return { apiKey, model };
};

module.exports = { getGeminiConfig };
