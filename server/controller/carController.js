const Car = require("../models/CarDetail");
const User = require("../models/User");

exports.addCar = async (req, res) => {
  try {
    const { carName, brand, model, numberPlate, fuelType } = req.body;
    if (!carName || !brand || !model || !numberPlate || !fuelType) {
      return res.status(400).json({ success: false, message: "All car fields are required" });
    }

    const normalizedPlate = numberPlate.trim().toUpperCase();
    const existingCar = await Car.findOne({ numberPlate: normalizedPlate });
    if (existingCar) {
      return res.status(409).json({ success: false, message: "Vehicle number plate is already registered" });
    }

    const car = await Car.create({
      userId: req.user.id,
      carName: carName.trim(),
      brand: brand.trim(),
      model: model.trim(),
      numberPlate: normalizedPlate,
      fuelType,
    });

    await User.findByIdAndUpdate(req.user.id, { $addToSet: { cars: car._id } });

    return res.status(201).json({ success: true, message: "Car registered successfully", car });
  } catch (error) {
    console.error("Add car error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getMyCars = async (req, res) => {
  try {
    const cars = await Car.find({ userId: req.user.id }).sort({ createdAt: -1 });
    return res.json({ success: true, cars });
  } catch (error) {
    console.error("Get cars error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getCarById = async (req, res) => {
  try {
    const car = await Car.findOne({ _id: req.params.id, userId: req.user.id });
    if (!car) return res.status(404).json({ success: false, message: "Car not found" });
    return res.json({ success: true, car });
  } catch (error) {
    console.error("Get car error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.deleteCar = async (req, res) => {
  try {
    const car = await Car.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!car) return res.status(404).json({ success: false, message: "Car not found" });

    await User.findByIdAndUpdate(req.user.id, { $pull: { cars: car._id } });
    return res.json({ success: true, message: "Car deleted successfully" });
  } catch (error) {
    console.error("Delete car error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
