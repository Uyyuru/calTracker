const mongoose = require("mongoose");

const userGoalsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    dailyCalories: {
      type: Number,
      required: [true, "Daily calories are required"],
      min: [0, "Daily calories cannot be negative"],
      default: 2000,
    },
    dailyProtein: {
      type: Number,
      required: [true, "Daily protein is required"],
      min: [0, "Daily protein cannot be negative"],
      default: 150,
    },
    dailyCarbs: {
      type: Number,
      required: [true, "Daily carbs are required"],
      min: [0, "Daily carbs cannot be negative"],
      default: 200,
    },
    dailyFats: {
      type: Number,
      required: [true, "Daily fats are required"],
      min: [0, "Daily fats cannot be negative"],
      default: 50,
    },
    weightGoal: {
      type: Number,
      required: [true, "Weight goal is required"],
      min: [0, "Weight goal cannot be negative"],
      default: 65,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("UserGoals", userGoalsSchema);
