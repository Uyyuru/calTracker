const User = require("../models/User");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");

const sendAuth = (res, user, statusCode = 200) => {
  const token = user.getJWTToken();
  res.status(statusCode).json({
    token,
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
    },
  });
};

const register = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    throw new AppError("Username, email, and password are required", 400);
  }

  const user = await User.create({ username, email, password });
  sendAuth(res, user, 201);
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    throw new AppError("Email and password are required", 400);
  }

  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await user.comparePassword(password))) {
    throw new AppError("Invalid email or password", 401);
  }

  sendAuth(res, user);
});

const me = asyncHandler(async (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      username: req.user.username,
      email: req.user.email,
    },
  });
});

module.exports = { register, login, me };
