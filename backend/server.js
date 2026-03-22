require("dotenv").config();
require("dotenv").config();
process.env.MONGO_URI = mongodb+srv://admin:Admin123@cluster0.sqyeaqj.mongodb.net/?appName=Cluster0;
process.env.JWT_SECRET = 'supersecretjwtkey1234567890abcdefghijklmnop';
process.env.PORT = '5000';
process.env.NODE_ENV = 'development';
process.env.RATE_LIMIT_MAX = '200';
process.env.ANOMALY_BURST_THRESHOLD = '20';
process.env.ANOMALY_WINDOW_SECONDS = '10';
process.env.ANOMALY_FLAG_THRESHOLD = '50';
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const path = require("path");

const connectDB = require("./config/database");
const { firewallMiddleware } = require("./middleware/firewallEngine");
const { sendError } = require("./utils/response");
const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const apiRoutes = require("./routes/api");

const app = express();
const PORT = process.env.PORT || 5000;

connectDB();

app.use(helmet({ crossOriginEmbedderPolicy: false, contentSecurityPolicy: false }));
app.use(cors({ origin: "*", methods: ["GET","POST","PUT","DELETE","PATCH","OPTIONS"], allowedHeaders: ["Content-Type","Authorization"], credentials: true }));
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

const globalLimiter = rateLimit({ windowMs: 60000, max: 200, standardHeaders: true, legacyHeaders: false });
app.use(globalLimiter);

if (process.env.NODE_ENV !== "production") app.use(morgan("dev"));

app.use(firewallMiddleware);

app.get("/health", (req, res) => res.json({ status: "operational", service: "AI Firewall System", timestamp: new Date().toISOString(), uptime: Math.floor(process.uptime()) }));

app.use("/auth", authRoutes);
app.use("/api", apiRoutes);
app.use("/admin", adminRoutes);

app.use(express.static(path.join(__dirname, "../frontend")));

app.use((err, req, res, next) => {
  console.error("Error:", err.message);
  return sendError(res, err.message || "Internal server error", err.status || 500);
});

app.use((req, res) => sendError(res, "Route not found", 404));

app.listen(PORT, () => {
  console.log("");
  console.log("============================================");
  console.log("  AI FIREWALL SYSTEM - ONLINE");
  console.log("  Port: " + PORT);
  console.log("  Dashboard: open frontend/index.html");
  console.log("============================================");
  console.log("");
});
