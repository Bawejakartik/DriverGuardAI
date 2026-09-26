const mongoose = require("mongoose");

const driverAttentionSchema = new mongoose.Schema(
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
    carId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Car",
      required: true,
    },
    eventType: {
      type: String,
      enum: ["DROWSINESS", "YAWNING", "HEAD_NODDING", "EYES_CLOSED", "ALERT"],
      required: true,
    },
    driverStatus: {
      type: String,
      enum: ["ALERT", "EYES CLOSED", "DROWSY", "YAWNING", "HEAD NODDING"],
    },
    faceDetected: Boolean,
    eyeStatus: {
      type: String,
      enum: ["open", "closed"],
    },
    metrics: {
      ear: Number,
      mar: Number,
      pitch: Number,
      yaw: Number,
      roll: Number,
    },
    time: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("DriverEvent", driverAttentionSchema);
