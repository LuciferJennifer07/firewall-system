<<<<<<< HEAD
﻿require("dotenv").config();
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
=======
// server.js
// 🔥 Centralized AI-Powered Application Firewall System
// Main server entry point

require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const connectDB = require('./config/database');
const { firewallMiddleware } = require('./middleware/firewallEngine');
const { sendError } = require('./utils/response');

// Route imports
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const apiRoutes = require('./routes/api');
>>>>>>> 347fe220f0110165290338289b01bc13e966bdc5

const app = express();
const PORT = process.env.PORT || 5000;

<<<<<<< HEAD
connectDB();
// Auto seed admin user on startup
const autoSeed = async () => {
  try {
    const mongoose = require('mongoose');
    await new Promise(resolve => setTimeout(resolve, 3000));
    const bcrypt = require('bcryptjs');
    const db = mongoose.connection.db;
    const existing = await db.collection('users').findOne({ email: 'admin@firewall.io' });
    if (!existing) {
      const hash = await bcrypt.hash('Admin123', 12);
      await db.collection('users').insertOne({
        username: 'admin',
        email: 'admin@firewall.io',
        password: hash,
        role: 'admin',
        isActive: true,
        createdAt: new Date()
      });
      console.log('✅ Admin created: admin@firewall.io / Admin123');
    } else {
      console.log('✅ Admin already exists');
    }
    const ruleCount = await db.collection('firewallrules').countDocuments();
    if (ruleCount === 0) {
      await db.collection('firewallrules').insertMany([
        { type: 'ip_block', value: '10.10.10.10', action: 'block', reason: 'Demo IP', isActive: true, priority: 150, hitCount: 0, createdAt: new Date() },
        { type: 'domain_block', value: 'malicious.com', action: 'block', reason: 'Malware', isActive: true, priority: 150, hitCount: 0, createdAt: new Date() },
      ]);
      console.log('✅ Sample rules created');
    }
  } catch (err) {
    console.error('Seed error:', err.message);
  }
};

autoSeed();

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
=======
// ══════════════════════════════════════════
//  CONNECT DATABASE
// ══════════════════════════════════════════
connectDB();

// ══════════════════════════════════════════
//  SECURITY HEADERS (Helmet)
// ══════════════════════════════════════════
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:'],
    },
  },
}));

// ══════════════════════════════════════════
//  CORS CONFIGURATION
// ══════════════════════════════════════════
app.use(cors({
  origin: process.env.CLIENT_URL || ['http://localhost:3000', 'http://localhost:5500', 'http://127.0.0.1:5500'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// ══════════════════════════════════════════
//  BODY PARSING
// ══════════════════════════════════════════
app.use(express.json({ limit: '10kb' })); // Limit body size
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ══════════════════════════════════════════
//  GLOBAL RATE LIMITER (DDoS Protection)
// ══════════════════════════════════════════
const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60 * 1000, // 1 minute
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
  skip: (req) => req.path === '/health', // Skip health checks
});

// Stricter limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { success: false, message: 'Too many authentication attempts.' },
});

app.use(globalLimiter);

// ══════════════════════════════════════════
//  REQUEST LOGGING (Dev)
// ══════════════════════════════════════════
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// ══════════════════════════════════════════
//  🔥 FIREWALL MIDDLEWARE (Core Engine)
//  Applied BEFORE all routes
// ══════════════════════════════════════════
app.use(firewallMiddleware);

// ══════════════════════════════════════════
//  ROUTES
// ══════════════════════════════════════════

// Health check (bypass firewall logging)
app.get('/health', (req, res) => {
  res.json({
    status: 'operational',
    service: 'AI Firewall System',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Auth routes
app.use('/auth', authLimiter, authRoutes);

// Protected API routes
app.use('/api', apiRoutes);

// Admin routes (protected + admin only)
app.use('/admin', adminRoutes);

// Serve frontend static files if present
app.use(express.static(path.join(__dirname, '../frontend')));

// Catch-all for frontend SPA (serve index.html)
app.get('*', (req, res, next) => {
  // Don't intercept API routes
  if (req.path.startsWith('/api') || req.path.startsWith('/admin') || req.path.startsWith('/auth')) {
    return next();
  }
  res.sendFile(path.join(__dirname, '../frontend/index.html'), (err) => {
    if (err) next(); // If no frontend file, continue
  });
});

// ══════════════════════════════════════════
//  GLOBAL ERROR HANDLER
// ══════════════════════════════════════════
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err.stack);

  if (err.name === 'ValidationError') {
    return sendError(res, 'Validation failed', 422, Object.values(err.errors).map(e => e.message));
  }
  if (err.name === 'CastError') {
    return sendError(res, 'Invalid resource ID', 400);
  }

  return sendError(res, err.message || 'Internal server error', err.status || 500);
});

// ══════════════════════════════════════════
//  404 HANDLER
// ══════════════════════════════════════════
app.use((req, res) => {
  sendError(res, `Route ${req.originalUrl} not found`, 404);
});

// ══════════════════════════════════════════
//  START SERVER
// ══════════════════════════════════════════
const server = app.listen(PORT, () => {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║  🔥 AI FIREWALL SYSTEM — ONLINE          ║');
  console.log(`║  Port: ${PORT}                              ║`);
  console.log(`║  Mode: ${process.env.NODE_ENV || 'development'}                    ║`);
  console.log('╚══════════════════════════════════════════╝\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});

module.exports = app;
>>>>>>> 347fe220f0110165290338289b01bc13e966bdc5
