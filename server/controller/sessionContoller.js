const mongoose = require("mongoose");
const Car = require("../models/CarDetail");
const Session = require("../models/DriverSession");

exports.sessionStart = async (req, res) => {
  try {
    const { carId } = req.body;
    if (!carId || !mongoose.isValidObjectId(carId)) {
      return res.status(400).json({ success: false, message: "Valid carId is required" });
    }

    const car = await Car.findOne({ _id: carId, userId: req.user.id });
    if (!car) return res.status(404).json({ success: false, message: "Car not found" });

    const activeSession = await Session.findOne({ userId: req.user.id, status: "ACTIVE" });
    if (activeSession) {
      return res.status(409).json({ success: false, message: "You already have an active driving session", session: activeSession });
    }

    const session = await Session.create({ userId: req.user.id, carId, startTime: new Date(), status: "ACTIVE" });
    return res.status(201).json({ success: true, message: "Driving session started", session });
  } catch (error) {
    console.error("Start session error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.endSession = async (req, res) => {
  try {
    const session = await Session.findOne({ _id: req.params.id, userId: req.user.id });
    if (!session) return res.status(404).json({ success: false, message: "Session not found" });
    if (session.status !== "ACTIVE") return res.status(409).json({ success: false, message: "Session is already closed", session });

    const endTime = new Date();
    session.endTime = endTime;
    session.duration = Math.max(0, Math.round((endTime - session.startTime) / 60000));
    session.status = "COMPLETED";
    await session.save();

    return res.json({ success: true, message: "Driving session ended", session });
  } catch (error) {
    console.error("End session error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getActiveSession = async (req, res) => {
  const session = await Session.findOne({ userId: req.user.id, status: "ACTIVE" }).populate("carId");
  return res.json({ success: true, session });
};

exports.getSessions = async (req, res) => {
  try {
    const sessions = await Session.find({ userId: req.user.id })
      .populate("carId", "carName brand model numberPlate")
      .sort({ startTime: -1 });
    return res.json({ success: true, sessions });
  } catch (error) {
    console.error("Get sessions error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getSessionById = async (req, res) => {
  try {
    const session = await Session.findOne({ _id: req.params.id, userId: req.user.id }).populate("carId");
    if (!session) return res.status(404).json({ success: false, message: "Session not found" });
    return res.json({ success: true, session });
  } catch (error) {
    console.error("Get session error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
