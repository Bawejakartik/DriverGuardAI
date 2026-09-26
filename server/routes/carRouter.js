const express = require("express");
const { auth } = require("../middleware/authMiddleware");
const { addCar, getMyCars, getCarById, deleteCar } = require("../controller/carController");

const router = express.Router();

router.use(auth);
router.post("/", addCar);
router.get("/", getMyCars);
router.get("/:id", getCarById);
router.delete("/:id", deleteCar);

module.exports = router;
