const AppError = require("./AppError");

const isDateOnly = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));

const resolveTimeZone = (timeZone) => {
  const candidate = timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  try {
    Intl.DateTimeFormat("en-US", { timeZone: candidate });
    return candidate;
  } catch (error) {
    throw new AppError("Invalid timezone", 400);
  }
};

const zoneOffsetMs = (instant, timeZone) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  const map = {};
  parts.forEach((part) => {
    if (part.type !== "literal") {
      map[part.type] = part.value;
    }
  });
  let hour = Number(map.hour);
  let day = Number(map.day);
  if (hour === 24) {
    hour = 0;
    day += 1;
  }
  const asUtc = Date.UTC(Number(map.year), Number(map.month) - 1, day, hour, Number(map.minute), Number(map.second));
  return asUtc - instant.getTime();
};

const zonedDateTime = (dateString, hours, minutes, seconds, milliseconds, timeZone) => {
  const [year, month, day] = dateString.split("-").map(Number);
  const wholeSecond = Date.UTC(year, month - 1, day, hours, minutes, seconds);
  let utc = wholeSecond - zoneOffsetMs(new Date(wholeSecond), timeZone);
  const adjusted = wholeSecond - zoneOffsetMs(new Date(utc), timeZone);
  if (adjusted !== utc) {
    utc = adjusted;
  }
  return new Date(utc + milliseconds);
};

const parseBoundary = (value, endOfDay, timeZone) => {
  if (isDateOnly(value)) {
    return endOfDay
      ? zonedDateTime(value, 23, 59, 59, 999, timeZone)
      : zonedDateTime(value, 0, 0, 0, 0, timeZone);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
};

const calendarUtc = (value, fallbackDate) => {
  if (isDateOnly(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return Date.UTC(year, month - 1, day);
  }
  const date = value ? new Date(value) : fallbackDate;
  if (Number.isNaN(date.getTime())) {
    throw new AppError("Invalid date", 400);
  }
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
};

const parseDateRange = (from, to, timeZone) => {
  const zone = resolveTimeZone(timeZone);
  const range = {};

  if (from) {
    const start = parseBoundary(from, false, zone);
    if (!start) {
      throw new AppError("Invalid from date", 400);
    }
    range.$gte = start;
  }

  if (to) {
    const end = parseBoundary(to, true, zone);
    if (!end) {
      throw new AppError("Invalid to date", 400);
    }
    range.$lte = end;
  }

  if (range.$gte && range.$lte && range.$gte > range.$lte) {
    throw new AppError("`from` must be before `to`", 400);
  }

  return Object.keys(range).length ? range : undefined;
};

const inclusiveDayCount = (from, to) => {
  const today = new Date();
  const startDay = calendarUtc(from, today);
  const endDay = calendarUtc(to, today);
  return Math.max(1, Math.round((endDay - startDay) / 86400000) + 1);
};

module.exports = { parseDateRange, inclusiveDayCount, resolveTimeZone, isDateOnly };
