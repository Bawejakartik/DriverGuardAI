const mongoose = require("mongoose");

const connectDB = async () => {
  if (!process.env.DB_URL) {
    throw new Error("DB_URL is not configured");
  }

  await mongoose.connect(process.env.DB_URL);
  console.log("MongoDB connected successfully");
};

module.exports = connectDB;
