const mongoose = require("mongoose");
const DriverEvent = require("../models/AttentionLog");
const Session = require("../models/DriverSession");

const statusToEventType = {
  DROWSY: "DROWSINESS",
  YAWNING: "YAWNING",
  "HEAD NODDING": "HEAD_NODDING",
  "EYES CLOSED": "EYES_CLOSED",
  ALERT: "ALERT",
};

exports.driverInfo = async (req, res) => {
  try {
    const { sessionId, driverStatus, faceDetected, eyeStatus, metrics } = req.body;

    if (!sessionId || !mongoose.isValidObjectId(sessionId) || !driverStatus) {
      return res.status(400).json({ success: false, message: "sessionId and driverStatus are required" });
    }

    const session = await Session.findOne({ _id: sessionId, userId: req.user.id, status: "ACTIVE" });
    if (!session) return res.status(404).json({ success: false, message: "Active session not found" });

    const eventType = statusToEventType[driverStatus];
    if (!eventType) return res.status(400).json({ success: false, message: "Unsupported driver status" });

    const lastEvent = await DriverEvent.findOne({ sessionId }).sort({ time: -1 });
    if (lastEvent?.driverStatus === driverStatus) {
      return res.status(200).json({ success: true, saved: false, message: "Duplicate consecutive status ignored" });
    }

    const event = await DriverEvent.create({
      sessionId,
      userId: req.user.id,
      carId: session.carId,
      eventType,
      driverStatus,
      faceDetected,
      eyeStatus,
      metrics,
    });

    const increment = { eventCount: 1 };
    if (eventType === "DROWSINESS") increment.drowsinessCount = 1;
    if (eventType === "YAWNING") increment.yawningCount = 1;
    if (eventType === "HEAD_NODDING") increment.headNoddingCount = 1;
    await Session.findByIdAndUpdate(sessionId, { $inc: increment });

    return res.status(201).json({ success: true, saved: true, event });
  } catch (error) {
    console.error("Driver event error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getSessionEvents = async (req, res) => {
  try {
    const session = await Session.findOne({ _id: req.params.sessionId, userId: req.user.id });
    if (!session) return res.status(404).json({ success: false, message: "Session not found" });

    const events = await DriverEvent.find({ sessionId: session._id }).sort({ time: 1 });
    return res.json({ success: true, events });
  } catch (error) {
    console.error("Get events error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
