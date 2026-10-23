const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      trim: true,
      maxlength: 120,
      default: "New Chat",
    },
    lastMessageAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

chatSchema.index({ userId: 1, updatedAt: -1 });

module.exports = mongoose.model("Chat", chatSchema);
