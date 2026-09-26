const express = require("express");
const { auth } = require("../middleware/authMiddleware");
const {
  sessionStart,
  endSession,
  getActiveSession,
  getSessions,
  getSessionById,
} = require("../controller/sessionContoller");

const router = express.Router();
router.use(auth);

router.post("/start", sessionStart);
router.post("/end/:id", endSession);
router.get("/active", getActiveSession);
router.get("/", getSessions);
router.get("/:id", getSessionById);

module.exports = router;
