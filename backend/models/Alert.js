<<<<<<< HEAD
﻿const mongoose = require("mongoose");

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
=======
// models/Alert.js
// Stores anomaly detection alerts and suspicious activity

const mongoose = require('mongoose');

const AlertSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      'burst_traffic',       // High-frequency requests in short window
      'ddos_attempt',        // Massive request flood
      'brute_force',         // Repeated failed auth
      'port_scan',           // Probing many endpoints
      'suspicious_payload',  // Malicious payload detected
      'geo_anomaly',         // Unusual geographic origin
      'rate_limit_breach',   // Hit rate limit repeatedly
      'pattern_anomaly',     // Unusual request pattern
    ],
    required: true,
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
    index: true,
  },
  ip: {
    type: String,
    required: true,
    index: true,
  },
  description: {
    type: String,
    required: true,
  },
  metadata: {
    requestCount: Number,
    windowSeconds: Number,
    endpoints: [String],
    userAgent: String,
    threshold: Number,
  },
  isResolved: {
    type: Boolean,
    default: false,
    index: true,
  },
  resolvedAt: {
    type: Date,
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  autoBlocked: {
    type: Boolean,
    default: false,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
}, { timestamps: false });

module.exports = mongoose.model('Alert', AlertSchema);
>>>>>>> 347fe220f0110165290338289b01bc13e966bdc5
