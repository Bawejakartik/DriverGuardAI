const express = require("express");
const { auth } = require("../middleware/authMiddleware");
const { overview, recentSessions, recentEvents } = require("../controller/dashboardContoller");

const router = express.Router();
router.use(auth);

router.get("/overview", overview);
router.get("/sessions", recentSessions);
router.get("/events", recentEvents);

module.exports = router;
