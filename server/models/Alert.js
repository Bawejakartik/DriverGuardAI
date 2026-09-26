const mongoose = require("mongoose");

const alertSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["DROWSINESS", "YAWNING", "HEAD_NODDING", "EYES_CLOSED"],
      required: true,
    },
    message: String,
    acknowledged: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Alert", alertSchema);
