const jwt = require("jsonwebtoken");
const User = require("../models/User");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");

const auth = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization;
  const token = header && header.startsWith("Bearer ") ? header.split(" ")[1] : null;

  if (!token) {
    throw new AppError("Not authorized", 401);
  }

  if (!process.env.JWT_SECRET) {
    throw new AppError("JWT_SECRET is not configured", 500);
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      throw new AppError("User not found", 401);
    }
    req.user = user;
    next();
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError("Invalid or expired token", 401);
  }
});

module.exports = auth;
