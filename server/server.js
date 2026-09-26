require("dotenv").config();

const http = require("http");
const app = require("./app");
const connectDB = require("./config/db");

const PORT = Number(process.env.PORT) || 4000;

const startServer = async () => {
  try {
    await connectDB();

    const server = http.createServer(app);
    server.listen(PORT, () => {
      console.log(`DriverGuardAI API running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();
