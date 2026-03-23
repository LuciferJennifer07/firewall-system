# ============================================================
# AI Firewall System - Auto Setup Script
# Run this in PowerShell as Administrator:
# Right-click PowerShell → Run as Administrator
# Then paste: .\setup.ps1
# ============================================================

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  AI FIREWALL SYSTEM - AUTO SETUP" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Fix execution policy
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned -Force

# Ask where to install
$installPath = Read-Host "Where to install? (Press Enter for D:\driver\files\firewall-system)"
if ([string]::IsNullOrWhiteSpace($installPath)) {
    $installPath = "D:\driver\files\firewall-system"
}

Write-Host ""
Write-Host "Creating project at: $installPath" -ForegroundColor Yellow
Write-Host ""

# Create all folders
$folders = @(
    "$installPath\backend\config",
    "$installPath\backend\controllers",
    "$installPath\backend\middleware",
    "$installPath\backend\models",
    "$installPath\backend\routes",
    "$installPath\backend\utils",
    "$installPath\frontend",
    "$installPath\scripts"
)

foreach ($folder in $folders) {
    New-Item -ItemType Directory -Force -Path $folder | Out-Null
    Write-Host "  Created: $folder" -ForegroundColor Green
}

Write-Host ""
Write-Host "Writing all source files..." -ForegroundColor Yellow
Write-Host ""

# ============================================================
# backend/package.json
# ============================================================
@'
{
  "name": "ai-firewall-backend",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "dotenv": "^16.0.3",
    "express": "^4.18.2",
    "express-rate-limit": "^6.7.0",
    "express-validator": "^7.0.1",
    "helmet": "^7.0.0",
    "jsonwebtoken": "^9.0.0",
    "mongoose": "^7.3.1",
    "morgan": "^1.10.0",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
'@ | Set-Content "$installPath\backend\package.json" -Encoding UTF8

# ============================================================
# backend/.env
# ============================================================
@'
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/firewall_db
JWT_SECRET=supersecretjwtkey1234567890abcdefghijklmnop
JWT_EXPIRE=24h
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=100
ANOMALY_BURST_THRESHOLD=20
ANOMALY_WINDOW_SECONDS=10
ANOMALY_FLAG_THRESHOLD=50
'@ | Set-Content "$installPath\backend\.env" -Encoding UTF8

# ============================================================
# backend/config/database.js
# ============================================================
@'
const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected: " + conn.connection.host);
    mongoose.connection.on("error", (err) => console.error("MongoDB Error:", err.message));
    mongoose.connection.on("disconnected", () => console.warn("MongoDB Disconnected."));
  } catch (error) {
    console.error("MongoDB Connection Failed:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
'@ | Set-Content "$installPath\backend\config\database.js" -Encoding UTF8

# ============================================================
# backend/utils/response.js
# ============================================================
@'
const sendSuccess = (res, data = {}, message = "Success", statusCode = 200) => {
  return res.status(statusCode).json({ success: true, message, data, timestamp: new Date().toISOString() });
};

const sendError = (res, message = "An error occurred", statusCode = 500, errors = null) => {
  const response = { success: false, message, timestamp: new Date().toISOString() };
  if (errors) response.errors = errors;
  return res.status(statusCode).json(response);
};

const sendBlocked = (res, reason = "Request blocked by firewall", rule = null) => {
  return res.status(403).json({
    success: false,
    message: "BLOCKED: Your request has been denied by the firewall.",
    reason, rule, timestamp: new Date().toISOString(),
  });
};

module.exports = { sendSuccess, sendError, sendBlocked };
'@ | Set-Content "$installPath\backend\utils\response.js" -Encoding UTF8

# ============================================================
# backend/utils/jwt.js
# ============================================================
@'
const jwt = require("jsonwebtoken");

const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "24h",
    issuer: "ai-firewall-system",
    audience: "firewall-client",
  });
};

const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET, {
    issuer: "ai-firewall-system",
    audience: "firewall-client",
  });
};

module.exports = { generateToken, verifyToken };
'@ | Set-Content "$installPath\backend\utils\jwt.js" -Encoding UTF8

# ============================================================
# backend/utils/anomalyDetector.js
# ============================================================
@'
const Alert = require("../models/Alert");
const FirewallRule = require("../models/FirewallRule");

const requestWindows = new Map();
const endpointTrackers = new Map();
const failedAuthTracker = new Map();

const THRESHOLDS = {
  BURST_REQUESTS: parseInt(process.env.ANOMALY_BURST_THRESHOLD) || 20,
  BURST_WINDOW_SECONDS: parseInt(process.env.ANOMALY_WINDOW_SECONDS) || 10,
  DDOS_REQUESTS: parseInt(process.env.ANOMALY_FLAG_THRESHOLD) || 50,
  DDOS_WINDOW_SECONDS: 60,
  PORT_SCAN_ENDPOINTS: 15,
  BRUTE_FORCE_ATTEMPTS: 5,
  AUTO_BLOCK_CRITICAL: true,
};

const cleanOldTimestamps = (timestamps, windowSeconds) => {
  const cutoff = Date.now() - windowSeconds * 1000;
  return timestamps.filter((ts) => ts > cutoff);
};

const analyzeRequest = async (ip, endpoint, method, userAgent) => {
  const now = Date.now();
  if (!requestWindows.has(ip)) requestWindows.set(ip, []);
  const ipTimestamps = cleanOldTimestamps(requestWindows.get(ip), THRESHOLDS.DDOS_WINDOW_SECONDS);
  ipTimestamps.push(now);
  requestWindows.set(ip, ipTimestamps);

  if (!endpointTrackers.has(ip)) endpointTrackers.set(ip, { timestamps: [], endpoints: new Set() });
  const epTracker = endpointTrackers.get(ip);
  epTracker.timestamps = cleanOldTimestamps(epTracker.timestamps, 30);
  epTracker.timestamps.push(now);
  epTracker.endpoints.add(endpoint);

  const burstWindow = cleanOldTimestamps(ipTimestamps, THRESHOLDS.BURST_WINDOW_SECONDS);
  if (burstWindow.length >= THRESHOLDS.BURST_REQUESTS) {
    const severity = burstWindow.length >= THRESHOLDS.DDOS_REQUESTS ? "critical" : "high";
    return createAnomaly("burst_traffic", severity, ip, endpoint, {
      requestCount: burstWindow.length, windowSeconds: THRESHOLDS.BURST_WINDOW_SECONDS,
      threshold: THRESHOLDS.BURST_REQUESTS, userAgent,
    }, "Burst traffic: " + burstWindow.length + " requests in " + THRESHOLDS.BURST_WINDOW_SECONDS + "s");
  }

  const ddosWindow = cleanOldTimestamps(ipTimestamps, THRESHOLDS.DDOS_WINDOW_SECONDS);
  if (ddosWindow.length >= THRESHOLDS.DDOS_REQUESTS) {
    return createAnomaly("ddos_attempt", "critical", ip, endpoint, {
      requestCount: ddosWindow.length, windowSeconds: THRESHOLDS.DDOS_WINDOW_SECONDS, userAgent,
    }, "Possible DDoS: " + ddosWindow.length + " requests in " + THRESHOLDS.DDOS_WINDOW_SECONDS + "s");
  }

  if (epTracker.endpoints.size >= THRESHOLDS.PORT_SCAN_ENDPOINTS) {
    return createAnomaly("port_scan", "high", ip, endpoint, {
      requestCount: epTracker.timestamps.length, windowSeconds: 30,
      endpoints: Array.from(epTracker.endpoints).slice(0, 10), userAgent,
    }, "Endpoint probing: " + epTracker.endpoints.size + " unique endpoints");
  }

  const suspiciousPatterns = [/(\.\.|\/\/)/, /<script/i, /union.*select/i, /exec\s*\(/i, /\beval\b/i, /etc\/passwd/i];
  if (suspiciousPatterns.some((p) => p.test(endpoint))) {
    return createAnomaly("suspicious_payload", "critical", ip, endpoint, {
      requestCount: 1, endpoints: [endpoint], userAgent,
    }, "Suspicious payload detected: " + endpoint.substring(0, 80));
  }

  return { isAnomaly: false };
};

const trackFailedAuth = async (ip) => {
  const now = Date.now();
  if (!failedAuthTracker.has(ip)) failedAuthTracker.set(ip, []);
  const attempts = cleanOldTimestamps(failedAuthTracker.get(ip), 60);
  attempts.push(now);
  failedAuthTracker.set(ip, attempts);
  if (attempts.length >= THRESHOLDS.BRUTE_FORCE_ATTEMPTS) {
    return createAnomaly("brute_force", "high", ip, "/auth/login", {
      requestCount: attempts.length, windowSeconds: 60, threshold: THRESHOLDS.BRUTE_FORCE_ATTEMPTS,
    }, "Brute force: " + attempts.length + " failed auth attempts in 60s");
  }
  return { isAnomaly: false };
};

const createAnomaly = async (type, severity, ip, endpoint, metadata, description) => {
  try {
    const recentAlert = await Alert.findOne({ ip, type, timestamp: { $gte: new Date(Date.now() - 60000) } });
    if (recentAlert) return { isAnomaly: true, type, severity, description, metadata, isDuplicate: true };

    const alert = await Alert.create({ type, severity, ip, description, metadata: { ...metadata, endpoints: metadata.endpoints || [endpoint] } });

    if (severity === "critical" && THRESHOLDS.AUTO_BLOCK_CRITICAL) {
      const existing = await FirewallRule.findOne({ type: "ip_block", value: ip, isActive: true });
      if (!existing) {
        await FirewallRule.create({ type: "ip_block", value: ip, action: "block", reason: "[AUTO-BLOCK] " + description, priority: 200 });
        console.log("Auto-blocked IP:", ip);
      }
      alert.autoBlocked = true;
      await alert.save();
    }
    return { isAnomaly: true, type, severity, description, metadata, alertId: alert._id };
  } catch (err) {
    console.error("Anomaly detector error:", err.message);
    return { isAnomaly: true, type, severity, description, metadata };
  }
};

const getRealtimeStats = () => {
  const ipCounts = [];
  for (const [ip, timestamps] of requestWindows.entries()) {
    const recent = cleanOldTimestamps(timestamps, 60);
    if (recent.length > 0) ipCounts.push({ ip, count: recent.length });
  }
  return { activeTrackedIPs: requestWindows.size, topIPs: ipCounts.sort((a, b) => b.count - a.count).slice(0, 5) };
};

module.exports = { analyzeRequest, trackFailedAuth, getRealtimeStats };
'@ | Set-Content "$installPath\backend\utils\anomalyDetector.js" -Encoding UTF8

# ============================================================
# backend/models/User.js
# ============================================================
@'
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ["admin", "user"], default: "user" },
  isActive: { type: Boolean, default: true },
  lastLogin: Date,
  loginAttempts: { type: Number, default: 0 },
  lockedUntil: Date,
}, { timestamps: true });

UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

UserSchema.methods.comparePassword = async function (entered) {
  return await bcrypt.compare(entered, this.password);
};

UserSchema.methods.isLocked = function () {
  return this.lockedUntil && this.lockedUntil > Date.now();
};

module.exports = mongoose.model("User", UserSchema);
'@ | Set-Content "$installPath\backend\models\User.js" -Encoding UTF8

# ============================================================
# backend/models/FirewallRule.js
# ============================================================
@'
const mongoose = require("mongoose");

const FirewallRuleSchema = new mongoose.Schema({
  type: { type: String, enum: ["ip_block","domain_block","ip_allow","domain_allow","custom"], required: true },
  value: { type: String, required: true, trim: true },
  action: { type: String, enum: ["block","allow","log","throttle"], default: "block" },
  reason: { type: String, default: "Manual rule" },
  isActive: { type: Boolean, default: true },
  priority: { type: Number, default: 100 },
  hitCount: { type: Number, default: 0 },
  lastTriggered: Date,
  expiresAt: Date,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  autoBlocked: { type: Boolean, default: false },
}, { timestamps: true });

FirewallRuleSchema.index({ type: 1, value: 1, isActive: 1 });

module.exports = mongoose.model("FirewallRule", FirewallRuleSchema);
'@ | Set-Content "$installPath\backend\models\FirewallRule.js" -Encoding UTF8

# ============================================================
# backend/models/RequestLog.js
# ============================================================
@'
const mongoose = require("mongoose");

const RequestLogSchema = new mongoose.Schema({
  ip: { type: String, required: true, index: true },
  method: String,
  endpoint: { type: String, required: true },
  host: String,
  userAgent: String,
  status: { type: String, enum: ["allowed","blocked","rate_limited","anomaly"], default: "allowed", index: true },
  statusCode: Number,
  responseTime: Number,
  blockedReason: String,
  ruleTriggered: String,
  isAnomaly: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now, index: true },
}, { timestamps: false });

RequestLogSchema.index({ ip: 1, timestamp: -1 });

module.exports = mongoose.model("RequestLog", RequestLogSchema);
'@ | Set-Content "$installPath\backend\models\RequestLog.js" -Encoding UTF8

# ============================================================
# backend/models/Alert.js
# ============================================================
@'
const mongoose = require("mongoose");

const AlertSchema = new mongoose.Schema({
  type: { type: String, enum: ["burst_traffic","ddos_attempt","brute_force","port_scan","suspicious_payload","rate_limit_breach","pattern_anomaly","geo_anomaly"], required: true },
  severity: { type: String, enum: ["low","medium","high","critical"], default: "medium", index: true },
  ip: { type: String, required: true, index: true },
  description: { type: String, required: true },
  metadata: { requestCount: Number, windowSeconds: Number, endpoints: [String], userAgent: String, threshold: Number },
  isResolved: { type: Boolean, default: false },
  resolvedAt: Date,
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  autoBlocked: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now, index: true },
}, { timestamps: false });

module.exports = mongoose.model("Alert", AlertSchema);
'@ | Set-Content "$installPath\backend\models\Alert.js" -Encoding UTF8

# ============================================================
# backend/middleware/auth.js
# ============================================================
@'
const { verifyToken } = require("../utils/jwt");
const { sendError } = require("../utils/response");
const User = require("../models/User");

const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }
    if (!token) return sendError(res, "Access denied. No token provided.", 401);
    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id).select("-password");
    if (!user) return sendError(res, "User no longer exists.", 401);
    if (!user.isActive) return sendError(res, "Account deactivated.", 401);
    req.user = user;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") return sendError(res, "Token expired.", 401);
    return sendError(res, "Invalid token.", 401);
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!req.user) return sendError(res, "Not authenticated.", 401);
  if (!roles.includes(req.user.role)) return sendError(res, "Access denied. Insufficient role.", 403);
  next();
};

module.exports = { protect, authorize };
'@ | Set-Content "$installPath\backend\middleware\auth.js" -Encoding UTF8

# ============================================================
# backend/middleware/validation.js
# ============================================================
@'
const { body, validationResult } = require("express-validator");
const { sendError } = require("../utils/response");

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return sendError(res, "Validation failed", 422, errors.array().map(e => ({ field: e.path, message: e.msg })));
  next();
};

const registerRules = [
  body("username").trim().isLength({ min: 3, max: 30 }).withMessage("Username must be 3-30 characters"),
  body("email").isEmail().normalizeEmail().withMessage("Valid email required"),
  body("password").isLength({ min: 6 }).withMessage("Password min 6 chars").matches(/\d/).withMessage("Password needs a number"),
];

const loginRules = [
  body("email").isEmail().normalizeEmail().withMessage("Valid email required"),
  body("password").notEmpty().withMessage("Password required"),
];

const blockIPRules = [
  body("ip").trim().notEmpty().withMessage("IP required").matches(/^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/).withMessage("Valid IPv4 required"),
];

const blockDomainRules = [
  body("domain").trim().notEmpty().withMessage("Domain required"),
];

module.exports = { validate, registerRules, loginRules, blockIPRules, blockDomainRules };
'@ | Set-Content "$installPath\backend\middleware\validation.js" -Encoding UTF8

# ============================================================
# backend/middleware/firewallEngine.js
# ============================================================
@'
const FirewallRule = require("../models/FirewallRule");
const RequestLog = require("../models/RequestLog");
const { analyzeRequest } = require("../utils/anomalyDetector");
const { sendBlocked } = require("../utils/response");

let ruleCache = { blockedIPs: new Set(), blockedDomains: new Set(), allowedIPs: new Set(), lastRefresh: 0 };
const CACHE_TTL = 30000;

const refreshRuleCache = async () => {
  try {
    const rules = await FirewallRule.find({ isActive: true }).lean();
    const newCache = { blockedIPs: new Set(), blockedDomains: new Set(), allowedIPs: new Set(), lastRefresh: Date.now() };
    for (const rule of rules) {
      if (rule.type === "ip_block") newCache.blockedIPs.add(rule.value);
      else if (rule.type === "domain_block") newCache.blockedDomains.add(rule.value.toLowerCase());
      else if (rule.type === "ip_allow") newCache.allowedIPs.add(rule.value);
    }
    ruleCache = newCache;
  } catch (err) { console.error("Rule cache error:", err.message); }
};

const logRequest = async (data) => { try { await RequestLog.create(data); } catch (_) {} };

const getClientIP = (req) => {
  return (req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.connection?.remoteAddress || "0.0.0.0").replace("::ffff:", "");
};

const incrementRuleHit = async (type, value) => {
  try { await FirewallRule.findOneAndUpdate({ type, value, isActive: true }, { $inc: { hitCount: 1 }, lastTriggered: new Date() }); } catch (_) {}
};

const firewallMiddleware = async (req, res, next) => {
  const startTime = Date.now();
  const ip = getClientIP(req);
  const host = req.headers.host || "";
  const endpoint = req.path;
  const method = req.method;
  const userAgent = req.headers["user-agent"] || "Unknown";
  req.clientIP = ip;

  if (Date.now() - ruleCache.lastRefresh > CACHE_TTL) await refreshRuleCache();

  if (ruleCache.allowedIPs.has(ip)) return next();

  if (ruleCache.blockedIPs.has(ip)) {
    logRequest({ ip, method, endpoint, host, userAgent, status: "blocked", statusCode: 403, responseTime: Date.now() - startTime, blockedReason: "IP blocked", ruleTriggered: "ip_block:" + ip });
    incrementRuleHit("ip_block", ip);
    return sendBlocked(res, "IP address " + ip + " is blocked", "ip_block:" + ip);
  }

  const hostDomain = host.split(":")[0].toLowerCase();
  for (const blockedDomain of ruleCache.blockedDomains) {
    if (hostDomain === blockedDomain || hostDomain.endsWith("." + blockedDomain)) {
      logRequest({ ip, method, endpoint, host, userAgent, status: "blocked", statusCode: 403, responseTime: Date.now() - startTime, blockedReason: "Domain blocked" });
      return sendBlocked(res, "Domain " + hostDomain + " is blocked");
    }
  }

  const anomaly = await analyzeRequest(ip, endpoint, method, userAgent);

  if (anomaly.isAnomaly && !anomaly.isDuplicate) {
    if (anomaly.severity === "critical") {
      logRequest({ ip, method, endpoint, host, userAgent, status: "anomaly", statusCode: 403, responseTime: Date.now() - startTime, isAnomaly: true, blockedReason: anomaly.description });
      return sendBlocked(res, "Anomaly detected: " + anomaly.description, anomaly.type);
    }
    req.anomalyDetected = anomaly;
    logRequest({ ip, method, endpoint, host, userAgent, status: "anomaly", responseTime: Date.now() - startTime, isAnomaly: true, blockedReason: anomaly.description });
  }

  const originalSend = res.send.bind(res);
  res.send = function (body) {
    if (!anomaly.isAnomaly) logRequest({ ip, method, endpoint, host, userAgent, status: "allowed", statusCode: res.statusCode, responseTime: Date.now() - startTime });
    return originalSend(body);
  };

  next();
};

refreshRuleCache();
setInterval(refreshRuleCache, CACHE_TTL);

module.exports = { firewallMiddleware, refreshRuleCache, getClientIP };
'@ | Set-Content "$installPath\backend\middleware\firewallEngine.js" -Encoding UTF8

# ============================================================
# backend/controllers/authController.js
# ============================================================
@'
const User = require("../models/User");
const { generateToken } = require("../utils/jwt");
const { sendSuccess, sendError } = require("../utils/response");
const { trackFailedAuth } = require("../utils/anomalyDetector");

const register = async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) return sendError(res, "User already exists", 409);
    const user = await User.create({ username, email, password, role: role === "admin" ? "admin" : "user" });
    const token = generateToken({ id: user._id, role: user.role, username: user.username });
    return sendSuccess(res, { token, user: { id: user._id, username: user.username, email: user.email, role: user.role } }, "Registration successful", 201);
  } catch (error) {
    if (error.code === 11000) return sendError(res, "User already exists", 409);
    return sendError(res, error.message, 500);
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const ip = req.clientIP || req.ip;
    const user = await User.findOne({ email }).select("+password");
    if (!user) { await trackFailedAuth(ip); return sendError(res, "Invalid credentials", 401); }
    if (user.isLocked()) return sendError(res, "Account locked. Try again later.", 423);
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      user.loginAttempts += 1;
      if (user.loginAttempts >= 5) { user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); user.loginAttempts = 0; }
      await user.save();
      await trackFailedAuth(ip);
      return sendError(res, "Invalid credentials", 401);
    }
    user.loginAttempts = 0; user.lockedUntil = undefined; user.lastLogin = new Date();
    await user.save();
    const token = generateToken({ id: user._id, role: user.role, username: user.username });
    return sendSuccess(res, { token, user: { id: user._id, username: user.username, email: user.email, role: user.role } }, "Login successful");
  } catch (error) { return sendError(res, error.message, 500); }
};

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return sendError(res, "User not found", 404);
    return sendSuccess(res, { id: user._id, username: user.username, email: user.email, role: user.role, lastLogin: user.lastLogin }, "Profile retrieved");
  } catch (error) { return sendError(res, error.message, 500); }
};

const listUsers = async (req, res) => {
  try {
    const users = await User.find({}).select("-password").sort({ createdAt: -1 });
    return sendSuccess(res, { users, total: users.length }, "Users retrieved");
  } catch (error) { return sendError(res, error.message, 500); }
};

module.exports = { register, login, getProfile, listUsers };
'@ | Set-Content "$installPath\backend\controllers\authController.js" -Encoding UTF8

# ============================================================
# backend/controllers/dataController.js
# ============================================================
@'
const { sendSuccess } = require("../utils/response");

const getData = async (req, res) => {
  return sendSuccess(res, {
    message: "Welcome to the secured API",
    user: req.user ? { id: req.user._id, username: req.user.username, role: req.user.role } : "guest",
    serverTime: new Date().toISOString(),
    ip: req.clientIP,
    sampleData: { records: [{ id: 1, name: "Secure Record Alpha", value: 42 }, { id: 2, name: "Secure Record Beta", value: 87 }] },
  }, "Data retrieved successfully");
};

const getPublicData = async (req, res) => {
  return sendSuccess(res, { message: "Public endpoint — firewall active", ip: req.clientIP, timestamp: new Date().toISOString() }, "Public data");
};

module.exports = { getData, getPublicData };
'@ | Set-Content "$installPath\backend\controllers\dataController.js" -Encoding UTF8

# ============================================================
# backend/controllers/adminController.js
# ============================================================
@'
const FirewallRule = require("../models/FirewallRule");
const RequestLog = require("../models/RequestLog");
const Alert = require("../models/Alert");
const { sendSuccess, sendError } = require("../utils/response");
const { refreshRuleCache } = require("../middleware/firewallEngine");
const anomalyDetector = require("../utils/anomalyDetector");

const blockIP = async (req, res) => {
  try {
    const { ip, reason, expiresAt } = req.body;
    const existing = await FirewallRule.findOne({ type: "ip_block", value: ip, isActive: true });
    if (existing) return sendError(res, "IP already blocked", 409);
    const rule = await FirewallRule.create({ type: "ip_block", value: ip, action: "block", reason: reason || "Manual block", expiresAt: expiresAt || null, createdBy: req.user._id, priority: 150 });
    await refreshRuleCache();
    return sendSuccess(res, { rule }, "IP " + ip + " blocked", 201);
  } catch (error) { return sendError(res, error.message, 500); }
};

const blockDomain = async (req, res) => {
  try {
    const { domain, reason } = req.body;
    const normalized = domain.toLowerCase().trim();
    const existing = await FirewallRule.findOne({ type: "domain_block", value: normalized, isActive: true });
    if (existing) return sendError(res, "Domain already blocked", 409);
    const rule = await FirewallRule.create({ type: "domain_block", value: normalized, action: "block", reason: reason || "Manual domain block", createdBy: req.user._id, priority: 150 });
    await refreshRuleCache();
    return sendSuccess(res, { rule }, "Domain " + normalized + " blocked", 201);
  } catch (error) { return sendError(res, error.message, 500); }
};

const removeRule = async (req, res) => {
  try {
    const rule = await FirewallRule.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!rule) return sendError(res, "Rule not found", 404);
    await refreshRuleCache();
    return sendSuccess(res, { rule }, "Rule removed");
  } catch (error) { return sendError(res, error.message, 500); }
};

const getRules = async (req, res) => {
  try {
    const { page = 1, limit = 50, isActive = "true" } = req.query;
    const filter = {};
    if (isActive !== "all") filter.isActive = isActive === "true";
    const rules = await FirewallRule.find(filter).populate("createdBy", "username").sort({ priority: -1, createdAt: -1 }).limit(limit * 1).skip((page - 1) * limit);
    const total = await FirewallRule.countDocuments(filter);
    return sendSuccess(res, { rules, total }, "Rules retrieved");
  } catch (error) { return sendError(res, error.message, 500); }
};

const getLogs = async (req, res) => {
  try {
    const { page = 1, limit = 100, status, ip, isAnomaly } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (ip) filter.ip = { $regex: ip };
    if (isAnomaly === "true") filter.isAnomaly = true;
    const logs = await RequestLog.find(filter).sort({ timestamp: -1 }).limit(limit * 1).skip((page - 1) * limit).lean();
    const total = await RequestLog.countDocuments(filter);
    return sendSuccess(res, { logs, total }, "Logs retrieved");
  } catch (error) { return sendError(res, error.message, 500); }
};

const getAlerts = async (req, res) => {
  try {
    const { page = 1, limit = 50, severity, isResolved = "false" } = req.query;
    const filter = {};
    if (severity) filter.severity = severity;
    if (isResolved !== "all") filter.isResolved = isResolved === "true";
    const alerts = await Alert.find(filter).sort({ timestamp: -1 }).limit(limit * 1).skip((page - 1) * limit);
    const total = await Alert.countDocuments(filter);
    const criticalCount = await Alert.countDocuments({ severity: "critical", isResolved: false });
    return sendSuccess(res, { alerts, total, criticalCount }, "Alerts retrieved");
  } catch (error) { return sendError(res, error.message, 500); }
};

const resolveAlert = async (req, res) => {
  try {
    const alert = await Alert.findByIdAndUpdate(req.params.id, { isResolved: true, resolvedAt: new Date(), resolvedBy: req.user._id }, { new: true });
    if (!alert) return sendError(res, "Alert not found", 404);
    return sendSuccess(res, { alert }, "Alert resolved");
  } catch (error) { return sendError(res, error.message, 500); }
};

const getStats = async (req, res) => {
  try {
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const last1h = new Date(Date.now() - 60 * 60 * 1000);
    const [totalRequests, blockedRequests, anomalyRequests, activeRules, unresolvedAlerts, criticalAlerts, recentRequests, topBlockedIPs, trafficByHour] = await Promise.all([
      RequestLog.countDocuments({ timestamp: { $gte: last24h } }),
      RequestLog.countDocuments({ timestamp: { $gte: last24h }, status: "blocked" }),
      RequestLog.countDocuments({ timestamp: { $gte: last24h }, isAnomaly: true }),
      FirewallRule.countDocuments({ isActive: true }),
      Alert.countDocuments({ isResolved: false }),
      Alert.countDocuments({ isResolved: false, severity: "critical" }),
      RequestLog.countDocuments({ timestamp: { $gte: last1h } }),
      RequestLog.aggregate([{ $match: { status: "blocked", timestamp: { $gte: last24h } } }, { $group: { _id: "$ip", count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 5 }, { $project: { ip: "$_id", count: 1, _id: 0 } }]),
      RequestLog.aggregate([{ $match: { timestamp: { $gte: new Date(Date.now() - 12 * 60 * 60 * 1000) } } }, { $group: { _id: { $dateToString: { format: "%H:00", date: "$timestamp" } }, total: { $sum: 1 }, blocked: { $sum: { $cond: [{ $eq: ["$status", "blocked"] }, 1, 0] } }, allowed: { $sum: { $cond: [{ $eq: ["$status", "allowed"] }, 1, 0] } } } }, { $sort: { "_id": 1 } }]),
    ]);
    const realtimeStats = anomalyDetector.getRealtimeStats();
    return sendSuccess(res, {
      summary: { totalRequests, blockedRequests, allowedRequests: totalRequests - blockedRequests - anomalyRequests, anomalyRequests, blockRate: totalRequests > 0 ? ((blockedRequests / totalRequests) * 100).toFixed(1) : 0, activeRules, unresolvedAlerts, criticalAlerts, recentRequests },
      topBlockedIPs, trafficByHour, realtime: realtimeStats,
    }, "Stats retrieved");
  } catch (error) { return sendError(res, error.message, 500); }
};

const simulateAttack = async (req, res) => {
  const { type = "burst", targetIP = "10.0.0.1" } = req.body;
  const { analyzeRequest } = require("../utils/anomalyDetector");
  const results = [];
  const count = type === "ddos" ? 55 : 25;
  for (let i = 0; i < count; i++) {
    const result = await analyzeRequest(targetIP, "/api/endpoint-" + (i % 5), "GET", "AttackBot/1.0");
    if (result.isAnomaly && !result.isDuplicate) results.push(result);
  }
  return sendSuccess(res, { simulationType: type, targetIP, requestsSent: count, anomaliesDetected: results.length, results: results.slice(0, 3) }, "Simulation complete");
};

module.exports = { blockIP, blockDomain, removeRule, getRules, getLogs, getAlerts, resolveAlert, getStats, simulateAttack };
'@ | Set-Content "$installPath\backend\controllers\adminController.js" -Encoding UTF8

# ============================================================
# backend/routes/auth.js
# ============================================================
@'
const express = require("express");
const router = express.Router();
const { register, login, getProfile, listUsers } = require("../controllers/authController");
const { protect, authorize } = require("../middleware/auth");
const { registerRules, loginRules, validate } = require("../middleware/validation");

router.post("/register", registerRules, validate, register);
router.post("/login", loginRules, validate, login);
router.get("/me", protect, getProfile);
router.get("/users", protect, authorize("admin"), listUsers);

module.exports = router;
'@ | Set-Content "$installPath\backend\routes\auth.js" -Encoding UTF8

# ============================================================
# backend/routes/admin.js
# ============================================================
@'
const express = require("express");
const router = express.Router();
const { blockIP, blockDomain, removeRule, getRules, getLogs, getAlerts, resolveAlert, getStats, simulateAttack } = require("../controllers/adminController");
const { protect, authorize } = require("../middleware/auth");
const { blockIPRules, blockDomainRules, validate } = require("../middleware/validation");

router.use(protect, authorize("admin"));
router.post("/block/ip", blockIPRules, validate, blockIP);
router.post("/block/domain", blockDomainRules, validate, blockDomain);
router.get("/rules", getRules);
router.delete("/rules/:id", removeRule);
router.get("/logs", getLogs);
router.get("/alerts", getAlerts);
router.patch("/alerts/:id/resolve", resolveAlert);
router.get("/stats", getStats);
router.post("/simulate/attack", simulateAttack);

module.exports = router;
'@ | Set-Content "$installPath\backend\routes\admin.js" -Encoding UTF8

# ============================================================
# backend/routes/api.js
# ============================================================
@'
const express = require("express");
const router = express.Router();
const { getData, getPublicData } = require("../controllers/dataController");
const { protect } = require("../middleware/auth");

router.get("/data", protect, getData);
router.get("/public", getPublicData);

module.exports = router;
'@ | Set-Content "$installPath\backend\routes\api.js" -Encoding UTF8

# ============================================================
# backend/server.js
# ============================================================
@'
require("dotenv").config();
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
'@ | Set-Content "$installPath\backend\server.js" -Encoding UTF8

# ============================================================
# scripts/seed.js
# ============================================================
@'
require("dotenv").config({ path: require("path").join(__dirname, "../backend/.env") });
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema({ username: String, email: String, password: String, role: String, isActive: { type: Boolean, default: true } }, { timestamps: true });
const FirewallRuleSchema = new mongoose.Schema({ type: String, value: String, action: String, reason: String, isActive: { type: Boolean, default: true }, priority: Number, hitCount: { type: Number, default: 0 } }, { timestamps: true });
const User = mongoose.model("User", UserSchema);
const FirewallRule = mongoose.model("FirewallRule", FirewallRuleSchema);

async function seed() {
  const uri = process.env.MONGO_URI || "mongodb://localhost:27017/firewall_db";
  await mongoose.connect(uri);
  console.log("Connected to MongoDB:", uri);

  const existingAdmin = await User.findOne({ email: "admin@firewall.io" });
  if (!existingAdmin) {
    const hashed = await bcrypt.hash("Admin123", 12);
    await User.create({ username: "admin", email: "admin@firewall.io", password: hashed, role: "admin" });
    console.log("Admin created: admin@firewall.io / Admin123");
  } else { console.log("Admin already exists."); }

  const count = await FirewallRule.countDocuments();
  if (count === 0) {
    await FirewallRule.insertMany([
      { type: "ip_block", value: "10.10.10.10", action: "block", reason: "Demo blocked IP", priority: 150 },
      { type: "ip_block", value: "192.0.2.1", action: "block", reason: "Known malicious IP", priority: 150 },
      { type: "domain_block", value: "malicious.com", action: "block", reason: "Malware C2 server", priority: 150 },
      { type: "domain_block", value: "phishing.net", action: "block", reason: "Phishing domain", priority: 150 },
      { type: "ip_allow", value: "127.0.0.1", action: "allow", reason: "Localhost always allowed", priority: 300 },
    ]);
    console.log("Sample firewall rules created.");
  }

  console.log("\nSeeding complete!");
  console.log("Login: admin@firewall.io / Admin123\n");
  await mongoose.connection.close();
  process.exit(0);
}

seed().catch(err => { console.error("Seed failed:", err.message); process.exit(1); });
'@ | Set-Content "$installPath\scripts\seed.js" -Encoding UTF8

# ============================================================
# Write frontend/index.html — copy from the generated file
# ============================================================
Write-Host "  NOTE: Copy frontend/index.html from the chat download manually" -ForegroundColor Yellow
Write-Host "        (File too large for this script — download it separately)" -ForegroundColor Yellow

# ============================================================
# DONE - Run npm install
# ============================================================
Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  All files created successfully!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Installing npm packages..." -ForegroundColor Yellow
Write-Host ""

Set-Location "$installPath\backend"
npm install

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  SETUP COMPLETE! Next steps:" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "1. Edit .env file if using MongoDB Atlas:" -ForegroundColor Cyan
Write-Host "   $installPath\backend\.env" -ForegroundColor White
Write-Host ""
Write-Host "2. Seed the database:" -ForegroundColor Cyan
Write-Host "   cd $installPath" -ForegroundColor White
Write-Host "   node scripts\seed.js" -ForegroundColor White
Write-Host ""
Write-Host "3. Start the server:" -ForegroundColor Cyan
Write-Host "   cd $installPath\backend" -ForegroundColor White
Write-Host "   npm start" -ForegroundColor White
Write-Host ""
Write-Host "4. Open frontend\index.html in your browser" -ForegroundColor Cyan
Write-Host ""
Write-Host "Login: admin@firewall.io / Admin123" -ForegroundColor Green
Write-Host ""
