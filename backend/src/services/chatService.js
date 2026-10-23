const mongoose = require("mongoose");
const Chat = require("../models/chat");
const Message = require("../models/message");
const AppError = require("../utils/AppError");
const { getGeminiConfig } = require("./geminiClient");
const mealService = require("./mealService");
const goalsService = require("./goalsService");
const reportService = require("./reportService");
const { parsePagination, paginated } = require("../utils/pagination");

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"];
const UNITS = ["g", "ml", "serving", "piece"];

const mealFields = {
  foodName: { type: "string", description: "Name of the food" },
  mealType: { type: "string", enum: MEAL_TYPES },
  quantity: { type: "number" },
  unit: { type: "string", enum: UNITS },
  calories: { type: "number" },
  protein: { type: "number", description: "Grams of protein" },
  carbs: { type: "number", description: "Grams of carbohydrates" },
  fats: { type: "number", description: "Grams of fat" },
  consumedAt: { type: "string", description: "ISO date, YYYY-MM-DD" },
  micros: {
    type: "object",
    description: "Optional. iron and calcium in mg, vitaminA in mcg RAE, vitaminC in mg, vitaminD in mcg. Omit unknown nutrients. Use 0 only when the amount is actually zero.",
    properties: {
      iron: { type: "number" },
      calcium: { type: "number" },
      vitaminA: { type: "number" },
      vitaminC: { type: "number" },
      vitaminD: { type: "number" },
    },
  },
};

const functionDeclarations = [
  {
    name: "createMeal",
    description: "Log one food entry for the signed-in user. Estimate calories and macros when the user did not give numbers.",
    parameters: {
      type: "object",
      properties: mealFields,
      required: ["foodName", "mealType", "quantity", "calories", "protein", "carbs", "fats"],
    },
  },
  {
    name: "listMeals",
    description: "List the signed-in user's meals. Call this before updateMeal or deleteMeal when the user names a food.",
    parameters: {
      type: "object",
      properties: {
        from: { type: "string", description: "Start date YYYY-MM-DD" },
        to: { type: "string", description: "End date YYYY-MM-DD" },
        mealType: { type: "string", enum: MEAL_TYPES },
      },
    },
  },
  {
    name: "updateMeal",
    description: "Update one meal by the _id returned from listMeals.",
    parameters: {
      type: "object",
      properties: {
        mealId: { type: "string" },
        ...mealFields,
      },
      required: ["mealId"],
    },
  },
  {
    name: "deleteMeal",
    description: "Delete one meal by the _id returned from listMeals. If listMeals returned more than one match, do not call this; ask the user which row.",
    parameters: {
      type: "object",
      properties: {
        mealId: { type: "string" },
      },
      required: ["mealId"],
    },
  },
  {
    name: "getGoals",
    description: "Read the signed-in user's daily calorie and macro goals.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "updateGoals",
    description: "Change the signed-in user's goals. Include only fields that should change.",
    parameters: {
      type: "object",
      properties: {
        dailyCalories: { type: "number" },
        dailyProtein: { type: "number" },
        dailyCarbs: { type: "number" },
        dailyFats: { type: "number" },
        weightGoal: { type: "number" },
      },
    },
  },
  {
    name: "getDailySummary",
    description: "Compare goals with what the user ate on one date.",
    parameters: {
      type: "object",
      properties: {
        date: { type: "string", description: "YYYY-MM-DD" },
      },
      required: ["date"],
    },
  },
  {
    name: "getWeeklyReport",
    description: "Calorie trend, macro breakdown, and goal comparison for a date range.",
    parameters: {
      type: "object",
      properties: {
        from: { type: "string", description: "YYYY-MM-DD" },
        to: { type: "string", description: "YYYY-MM-DD" },
      },
      required: ["from", "to"],
    },
  },
];

const systemInstruction = () => {
  const today = new Date();
  const local = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  return [
    "You are a nutrition assistant inside a calorie tracker.",
    "The signed-in user is already known. Never ask for a user id and never pass one to a tool.",
    `Today's date is ${local}. Use it when the user says today.`,
    "Call a tool only to log, change, or delete food, or to read or change goals, or to fetch a daily or weekly report.",
    "Answer general nutrition questions in text and do not call a tool.",
    "calories, protein, carbs, and fats are required on a meal. If the user does not give numbers, estimate them, call the tool with those estimates, and say the estimates in your reply.",
    "Micronutrients are optional. Omit any nutrient you do not know. Never send 0 for an unknown micronutrient. If you include an estimate, say that it is an estimate.",
    "Before updateMeal or deleteMeal, call listMeals. Use the matching row's _id. If more than one row matches, ask which one and do not change anything yet.",
    "Keep replies short.",
  ].join(" ");
};

const withoutUser = (args = {}) => {
  const copy = { ...(args || {}) };
  delete copy.userId;
  return copy;
};

const atNoon = (value) => {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T12:00:00`);
  }
  return value;
};

const toStruct = (value) => {
  const plain = JSON.parse(JSON.stringify(value ?? { ok: true }));
  if (plain && typeof plain === "object" && !Array.isArray(plain)) {
    return plain;
  }
  return { result: plain };
};

const runTool = async (userId, name, args = {}) => {
  const input = withoutUser(args);

  if (name === "createMeal") {
    if (input.consumedAt) {
      input.consumedAt = atNoon(input.consumedAt);
    }
    const meal = await mealService.createMeal(userId, input, { source: "chat" });
    return { meal };
  }

  if (name === "listMeals") {
    return mealService.listMeals(userId, {
      from: input.from,
      to: input.to,
      mealType: input.mealType,
      limit: 20,
    });
  }

  if (name === "updateMeal") {
    const { mealId, ...rest } = input;
    if (rest.consumedAt) {
      rest.consumedAt = atNoon(rest.consumedAt);
    }
    const meal = await mealService.updateMeal(userId, mealId, rest);
    return { meal };
  }

  if (name === "deleteMeal") {
    const meal = await mealService.deleteMeal(userId, input.mealId);
    return { meal };
  }

  if (name === "getGoals") {
    const goals = await goalsService.getGoals(userId);
    return { goals };
  }

  if (name === "updateGoals") {
    const goals = await goalsService.upsertGoals(userId, input);
    return { goals };
  }

  if (name === "getDailySummary") {
    const query = { from: input.date, to: input.date };
    const [comparison, micros] = await Promise.all([
      reportService.goalsVsActual(userId, query),
      reportService.micronutrientSummary(userId, query),
    ]);
    return { comparison, micros };
  }

  if (name === "getWeeklyReport") {
    const query = { from: input.from, to: input.to };
    const [calories, macros, comparison, micros] = await Promise.all([
      reportService.weeklyCalorieTrend(userId, query),
      reportService.macroBreakdown(userId, query),
      reportService.goalsVsActual(userId, query),
      reportService.micronutrientSummary(userId, query),
    ]);
    return { calories, macros, comparison, micros };
  }

  return { error: `Unknown tool ${name}` };
};

const getChatForUser = async (userId, chatId) => {
  if (!mongoose.isValidObjectId(chatId)) {
    throw new AppError("Chat not found", 404);
  }
  const chat = await Chat.findById(chatId);
  if (!chat || String(chat.userId) !== String(userId)) {
    throw new AppError("Chat not found", 404);
  }
  return chat;
};

const createChat = async (userId) => Chat.create({ userId, title: "New Chat", lastMessageAt: new Date() });

const listChats = async (userId, query) => {
  const { page, limit, skip } = parsePagination(query);
  const filter = { userId };
  const [items, total] = await Promise.all([
    Chat.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit),
    Chat.countDocuments(filter),
  ]);
  return paginated({ items, total, page, limit });
};

const listMessages = async (userId, chatId) => {
  await getChatForUser(userId, chatId);
  const messages = await Message.find({ chatId }).sort({ createdAt: 1 });
  return messages;
};

const generateContent = async (contents) => {
  const { apiKey, model } = getGeminiConfig();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(30000),
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction() }] },
        tools: [{ functionDeclarations }],
        contents,
      }),
    });
  } catch (error) {
    if (error.name === "TimeoutError" || error.name === "AbortError") {
      throw new AppError("Chat analysis timed out", 504);
    }
    throw new AppError("Gemini request failed", 502);
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data.error?.message || "Gemini request failed";
    throw new AppError(message, response.status === 400 ? 400 : 502);
  }
  return data;
};

const sendMessage = async (userId, chatId, content) => {
  const text = String(content || "").trim();
  if (!text) {
    throw new AppError("Message is required", 400);
  }

  const chat = await getChatForUser(userId, chatId);
  const userMessage = await Message.create({ chatId: chat._id, role: "user", content: text });

  const history = await Message.find({ chatId: chat._id }).sort({ createdAt: -1 }).limit(20);
  const contents = history.reverse().map((item) => ({
    role: item.role === "assistant" ? "model" : "user",
    parts: [{ text: item.content }],
  }));

  let assistantText = "";
  for (let turn = 0; turn < 5; turn += 1) {
    const data = await generateContent(contents);
    const parts = data.candidates?.[0]?.content?.parts || [];
    const calls = parts.filter((part) => part.functionCall);

    if (!calls.length) {
      assistantText = parts
        .map((part) => part.text || "")
        .join("")
        .trim();
      break;
    }

    if (turn === 4) {
      break;
    }

    contents.push({ role: "model", parts });
    const responseParts = [];
    for (const part of calls) {
      const { name, args = {} } = part.functionCall;
      let result;
      try {
        result = await runTool(userId, name, args);
      } catch (error) {
        result = { error: error.message || "Tool failed" };
      }
      responseParts.push({
        functionResponse: {
          name,
          response: toStruct(result),
        },
      });
    }
    contents.push({ role: "user", parts: responseParts });
  }

  if (!assistantText) {
    assistantText = "I could not finish that. Try asking again in one step.";
  }

  const assistantMessage = await Message.create({
    chatId: chat._id,
    role: "assistant",
    content: assistantText,
  });

  if (chat.title === "New Chat") {
    chat.title = text.slice(0, 80);
  }
  chat.lastMessageAt = new Date();
  await chat.save();

  return { userMessage, assistantMessage, chat };
};

module.exports = {
  createChat,
  listChats,
  listMessages,
  sendMessage,
  runTool,
};
