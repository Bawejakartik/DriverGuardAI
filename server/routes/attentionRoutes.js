const express = require("express");
const { auth } = require("../middleware/authMiddleware");
const { driverInfo, getSessionEvents } = require("../controller/attentionController");

const router = express.Router();

// Python AI can call this endpoint using the user's JWT for now.
router.post("/driver-event", auth, driverInfo);
router.get("/session/:sessionId/events", auth, getSessionEvents);

module.exports = router;
