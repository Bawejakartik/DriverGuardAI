require("dotenv").config();

 
const express = require("express");

const http = require("http");
const db = require("./config/db");

const app = express();
const PORT = process.env.PORT;

const  attentionRoute = require("./routes/attentionRoutes");


const server = http.createServer(app);
const authRoute = require("./routes/authRouters");

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use("/api/v8", authRoute);
app.use("/api/v8/ai",attentionRoute);
db.connect();
server.listen(PORT, () => {
  console.log("server running on the port ", PORT);
});
