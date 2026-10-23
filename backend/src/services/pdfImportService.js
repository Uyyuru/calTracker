const { PDFParse } = require("pdf-parse");
const AppError = require("../utils/AppError");
const ImportJob = require("../models/ImportJob");
const { toNumber, normalizeMicros } = require("./mealService");
const { signedUrl } = require("./uploadService");
const { parsePagination, paginated } = require("../utils/pagination");

const HEADER_MAP = {
  food: "foodName",
  foodname: "foodName",
  item: "foodName",
  name: "foodName",
  meal: "mealType",
  mealtype: "mealType",
  type: "mealType",
  quantity: "quantity",
  qty: "quantity",
  amount: "quantity",
  unit: "unit",
  calories: "calories",
  kcal: "calories",
  cal: "calories",
  protein: "protein",
  carbs: "carbs",
  carbohydrates: "carbs",
  fat: "fats",
  fats: "fats",
  iron: "iron",
  calcium: "calcium",
  vitamina: "vitaminA",
  vitaminc: "vitaminC",
  vitamind: "vitaminD",
  date: "consumedAt",
  consumedat: "consumedAt",
  day: "consumedAt",
};

const UNITS = ["g", "ml", "serving", "piece"];
const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"];

const normalizeHeader = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");

const mapRow = (headers, row) => {
  const mapped = { micros: {} };
  headers.forEach((header, index) => {
    const key = HEADER_MAP[normalizeHeader(header)];
    const value = row[index];
    if (!key || value === undefined || value === "") {
      return;
    }
    if (["iron", "calcium", "vitaminA", "vitaminC", "vitaminD"].includes(key)) {
      const parsed = Number(String(value).replace(/,/g, "").trim());
      if (Number.isFinite(parsed) && parsed >= 0) {
        mapped.micros[key] = parsed;
      }
    } else if (["quantity", "calories", "protein", "carbs", "fats"].includes(key)) {
      mapped[key] = toNumber(value, 0);
    } else {
      mapped[key] = String(value).trim();
    }
  });
  return mapped;
};

const collectTables = (tableResult) => {
  if (tableResult.mergedTables && tableResult.mergedTables.length) {
    return tableResult.mergedTables;
  }
  const tables = [];
  (tableResult.pages || []).forEach((page) => {
    (page.tables || []).forEach((table) => tables.push(table));
  });
  return tables;
};

const rowsFromTables = (tables) => {
  const entries = [];
  tables.forEach((table) => {
    if (!table || table.length < 2) {
      return;
    }
    const headerIndex = table.findIndex((row) =>
      row.some((cell) => HEADER_MAP[normalizeHeader(cell)])
    );
    if (headerIndex === -1) {
      return;
    }
    const headers = table[headerIndex];
    table.forEach((row, index) => {
      if (index === headerIndex) {
        return;
      }
      const mapped = mapRow(headers, row);
      if (mapped.foodName) {
        entries.push(mapped);
      }
    });
  });
  return entries;
};

const toPreviewEntry = (entry) => {
  const mealType = MEAL_TYPES.includes(String(entry.mealType || "").toLowerCase())
    ? String(entry.mealType).toLowerCase()
    : "snack";

  return {
    foodName: entry.foodName,
    mealType,
    quantity: toNumber(entry.quantity, 1),
    unit: UNITS.includes(entry.unit) ? entry.unit : "serving",
    calories: toNumber(entry.calories, 0),
    protein: toNumber(entry.protein, 0),
    carbs: toNumber(entry.carbs, 0),
    fats: toNumber(entry.fats, 0),
    micros: normalizeMicros(entry.micros),
    consumedAt: entry.consumedAt || new Date().toISOString(),
    source: "pdf_import",
  };
};

const copyPdfBytes = (buffer) => {
  const bytes = new Uint8Array(buffer.length);
  bytes.set(buffer);
  return bytes;
};

const previewPdf = async (file) => {
  if (!file) {
    throw new AppError("PDF file is required", 400);
  }

  const parser = new PDFParse({ data: copyPdfBytes(file.buffer) });
  try {
    const tableResult = await parser.getTable();
    const entries = rowsFromTables(collectTables(tableResult)).map(toPreviewEntry);
    if (!entries.length) {
      throw new AppError("No table rows found. Use a PDF with a header row.", 400);
    }
    return { entries };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(error.message || "Failed to parse PDF", 400);
  } finally {
    await parser.destroy();
  }
};

const listImports = async (userId, query) => {
  const { page, limit, skip } = parsePagination(query);
  const filter = { userId };
  const [jobs, total] = await Promise.all([
    ImportJob.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    ImportJob.countDocuments(filter),
  ]);

  const items = jobs.map((job) => {
    const item = job.toObject();
    if (item.publicId) {
      item.secureUrl = signedUrl(item.publicId, item.resourceType || "raw");
    }
    return item;
  });

  return paginated({ items, total, page, limit });
};

module.exports = { previewPdf, listImports };
