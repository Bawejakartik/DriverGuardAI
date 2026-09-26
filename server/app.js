const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const authRoutes = require("./routes/authRouters");
const carRoutes = require("./routes/carRouter");
const sessionRoutes = require("./routes/sessionRoutes");
const attentionRoutes = require("./routes/attentionRoutes");
const dashboardRoutes = require("./routes/dashboardRouters");

const app = express();

const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim());

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/health", (_req, res) => {
  res.json({ success: true, service: "DriverGuardAI API", status: "UP" });
});

app.use("/api/v8/auth", authRoutes);
app.use("/api/v8/cars", carRoutes);
app.use("/api/v8/sessions", sessionRoutes);
app.use("/api/v8/ai", attentionRoutes);
app.use("/api/v8/dashboard", dashboardRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ success: false, message: "Internal server error" });
});

module.exports = app;
