export const MICROS = [
  { key: "iron", label: "Iron", unit: "mg" },
  { key: "calcium", label: "Calcium", unit: "mg" },
  { key: "vitaminA", label: "Vitamin A", unit: "mcg RAE" },
  { key: "vitaminC", label: "Vitamin C", unit: "mg" },
  { key: "vitaminD", label: "Vitamin D", unit: "mcg" },
];

export const clientTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

export const rangeQuery = (from, to, extra = {}) => {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  params.set("tz", clientTimeZone());
  Object.entries(extra).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  });
  return params.toString();
};

export const blankMicros = () =>
  MICROS.reduce((acc, item) => {
    acc[item.key] = "";
    return acc;
  }, {});

export const microsFromMeal = (meal) => {
  const source = meal?.micros || {};
  return MICROS.reduce((acc, item) => {
    const value = source[item.key];
    acc[item.key] = value === null || value === undefined ? "" : value;
    return acc;
  }, {});
};

export const collectMicros = (source = {}) => {
  const micros = {};
  const errors = {};
  MICROS.forEach(({ key, label }) => {
    const value = source[key];
    if (value === undefined || value === null || value === "") {
      micros[key] = null;
      return;
    }
    const parsed = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(parsed)) {
      errors[key] = `${label} must be a valid number`;
      return;
    }
    if (parsed < 0) {
      errors[key] = `${label} cannot be negative`;
      return;
    }
    micros[key] = parsed;
  });
  return { micros, errors };
};

export const formatAmount = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return null;
  }
  const rounded = Math.round(Number(value) * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
};

export const dateLabel = (date = new Date()) =>
  date
    .toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
    .toUpperCase();

export const greetingFor = (date = new Date()) => {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

