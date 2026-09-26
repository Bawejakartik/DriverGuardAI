const mongoose = require("mongoose");
const Session = require("../models/DriverSession");
const DriverEvent = require("../models/AttentionLog");

exports.overview = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const [totalSessions, activeSession, stats] = await Promise.all([
      Session.countDocuments({ userId }),
      Session.findOne({ userId, status: "ACTIVE" }).populate("carId"),
      Session.aggregate([
        { $match: { userId: userId } },
        {
          $group: {
            _id: null,
            totalDuration: { $sum: "$duration" },
            drowsinessCount: { $sum: "$drowsinessCount" },
            yawningCount: { $sum: "$yawningCount" },
            headNoddingCount: { $sum: "$headNoddingCount" },
            totalEvents: { $sum: "$eventCount" },
          },
        },
      ]),
    ]);

    return res.json({
      success: true,
      overview: {
        totalSessions,
        activeSession,
        ...(stats[0] || { totalDuration: 0, drowsinessCount: 0, yawningCount: 0, headNoddingCount: 0, totalEvents: 0 }),
      },
    });
  } catch (error) {
    console.error("Dashboard overview error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.recentSessions = async (req, res) => {
  const sessions = await Session.find({ userId: req.user.id })
    .populate("carId", "carName brand model numberPlate")
    .sort({ startTime: -1 })
    .limit(10);
  return res.json({ success: true, sessions });
};

exports.recentEvents = async (req, res) => {
  const events = await DriverEvent.find({ userId: req.user.id })
    .sort({ time: -1 })
    .limit(20);
  return res.json({ success: true, events });
};
