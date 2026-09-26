const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    fullname: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    drivingLicense: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true, select: false },
    cars: [{ type: mongoose.Schema.Types.ObjectId, ref: "Car" }],
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", userSchema);
