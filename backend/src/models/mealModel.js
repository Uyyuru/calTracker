const mongoose = require("mongoose");

const microField = {
  type: Number,
  default: null,
  validate: {
    validator(value) {
      return value === null || value === undefined || (Number.isFinite(value) && value >= 0);
    },
    message: "Value cannot be negative",
  },
};

const mealSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    mealType: {
      type: String,
      enum: {
        values: ["breakfast", "lunch", "dinner", "snack"],
        message: "Invalid meal type",
      },
      required: [true, "Meal type is required"],
    },
    foodName: {
      type: String,
      required: [true, "Food name is required"],
      trim: true,
      minlength: [1, "Food name is required"],
      maxlength: [200, "Food name must be less than 200 characters long"],
    },
    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [0, "Quantity cannot be negative"],
      max: [1000, "Quantity must be less than 1000"],
    },
    unit: {
      type: String,
      enum: {
        values: ["g", "ml", "serving", "piece"],
        message: "Invalid unit",
      },
      default: "serving",
    },
    calories: {
      type: Number,
      required: [true, "Calories are required"],
      min: [0, "Calories cannot be negative"],
    },
    protein: {
      type: Number,
      required: [true, "Protein is required"],
      min: [0, "Protein cannot be negative"],
    },
    carbs: {
      type: Number,
      required: [true, "Carbs are required"],
      min: [0, "Carbs cannot be negative"],
    },
    fats: {
      type: Number,
      required: [true, "Fats are required"],
      min: [0, "Fats cannot be negative"],
    },
    micros: {
      iron: microField,
      calcium: microField,
      vitaminA: microField,
      vitaminC: microField,
      vitaminD: microField,
    },
    consumedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    source: {
      type: String,
      enum: {
        values: ["manual", "ai_photo", "pdf_import", "chat"],
        message: "Invalid source",
      },
      default: "manual",
    },
    imageUrl: {
      type: String,
      trim: true,
    },
    imagePublicId: {
      type: String,
      trim: true,
    },
    imageResourceType: {
      type: String,
      trim: true,
    },
    originalText: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

mealSchema.index({ userId: 1, consumedAt: -1 });
mealSchema.index({ userId: 1, mealType: 1, consumedAt: -1 });

module.exports = mongoose.model("Meal", mealSchema);
