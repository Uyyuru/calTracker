const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const connectDB = require("./config/db");
const errorHandler = require("./middleware/errorHandler");
const AppError = require("./utils/AppError");

const authRoutes = require("./routes/authRoutes");
const goalsRoutes = require("./routes/goalsRoutes");
const mealRoutes = require("./routes/mealRoutes");
const reportRoutes = require("./routes/reportRoutes");
const extractRoutes = require("./routes/extractRoutes");
const chatRoutes = require("./routes/chatRoutes");
const importRoutes = require("./routes/importRoutes");

const app = express();
const PORT = process.env.PORT || 5000;
const frontendOrigin = process.env.FRONTEND_ORIGIN || "http://localhost:5173";

app.use(cors({ origin: frontendOrigin }));
app.use(express.json({ limit: "2mb" }));

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/goals", goalsRoutes);
app.use("/api/meals", mealRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/extract", extractRoutes);
app.use("/api/imports", importRoutes);
app.use("/api/chats", chatRoutes);

app.use((req, res, next) => {
  next(new AppError("Route not found", 404));
});

app.use(errorHandler);

const startServer = async () => {
  try {
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is missing. Add it to backend/.env");
    }
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();
