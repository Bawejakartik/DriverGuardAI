const express = require("express");
const { auth } = require("../middleware/authMiddleware");
const { Signup, Login, profile, logout } = require("../controller/authController");

const router = express.Router();

router.post("/signup", Signup);
router.post("/login", Login);
router.post("/logout", auth, logout);
router.get("/profile", auth, profile);

module.exports = router;
