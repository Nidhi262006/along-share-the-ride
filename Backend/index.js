require("dotenv").config();

const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { provisionAdmin } = require("./services/provisionAdmin");

const PORT = process.env.PORT || 3002;
const uri = process.env.MONGO_URL;
const jwtSecret = process.env.JWT_SECRET;

const app = express();
const { chatRouter, notificationRouter } = require("./routes/communication");

app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
  credentials: true,
}));
app.use(express.json({ limit: "16kb" }));
app.use(cookieParser());

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api/auth", require("./routes/auth"));
app.use("/api/rides", require("./routes/rides"));
app.use("/api/driver", require("./routes/driver"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/reports", require("./routes/reports"));
app.use("/api/assistant", require("./routes/assistant"));
app.use("/api/chat", chatRouter);
app.use("/api/notifications", notificationRouter);

app.use((error, _req, res, _next) => {
  console.error("Request failed:", error.name || "Error");
  if (error?.type === "entity.too.large") {
    return res.status(413).json({ message: "The uploaded document exceeds the 5 MB limit" });
  }
  if (error?.code === 11000) {
    return res.status(409).json({ message: "This record already exists" });
  }
  if (error?.name === "ValidationError" || error?.name === "CastError") {
    return res.status(400).json({ message: "The request contains invalid data" });
  }
  res.status(500).json({ message: "An unexpected server error occurred" });
});

async function start() {
  if (!uri) {
    console.error("Backend startup failed: MONGO_URL is not configured.");
    process.exit(1);
  }
  if (!jwtSecret || jwtSecret.length < 32) {
    console.error("Backend startup failed: JWT_SECRET must contain at least 32 characters.");
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    await provisionAdmin();
    app.listen(PORT, () => console.log(`along API listening on port ${PORT}`));
  } catch (error) {
    const details = { name: error?.name || "Error" };
    if (Number.isInteger(error?.code)) details.code = error.code;
    if (typeof error?.codeName === "string") details.codeName = error.codeName;
    console.error("Database connection failed:", details);
    process.exit(1);
  }
}

start();