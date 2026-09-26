const mongoose = require("mongoose");

const driverSessionSchema = new mongoose.Schema(
  {
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
      index: true,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "COMPLETED", "CANCELLED"],
      default: "ACTIVE",
      index: true,
    },
    startTime: {
      type: Date,
      default: Date.now,
    },
    endTime: Date,
    duration: {
      type: Number,
      default: 0,
      min: 0,
    },
    drowsinessCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    yawningCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    headNoddingCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    eventCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Session", driverSessionSchema);
