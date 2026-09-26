const mongoose = require("mongoose");

const carSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    carName: { type: String, required: true, trim: true },
    brand: { type: String, required: true, trim: true },
    model: { type: String, required: true, trim: true },
    numberPlate: { type: String, required: true, unique: true, uppercase: true, trim: true },
    fuelType: {
      type: String,
      enum: ["Petrol", "Diesel", "Electric", "Hybrid"],
      required: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Car", carSchema);
