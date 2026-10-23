const mongoose = require("mongoose");

const importJobSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    filename: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },
    error: {
      type: String,
      trim: true,
    },
    importedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    publicId: {
      type: String,
      trim: true,
    },
    resourceType: {
      type: String,
      trim: true,
    },
    format: {
      type: String,
      trim: true,
    },
    bytes: {
      type: Number,
      min: 0,
    },
  },
  { timestamps: true }
);

importJobSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("ImportJob", importJobSchema);
