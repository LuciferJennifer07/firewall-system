<<<<<<< HEAD
﻿const mongoose = require("mongoose");

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
=======
// models/RequestLog.js
// Stores all incoming request logs

const mongoose = require('mongoose');

const RequestLogSchema = new mongoose.Schema({
  ip: {
    type: String,
    required: true,
    index: true,
  },
  method: {
    type: String,
    enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
  },
  endpoint: {
    type: String,
    required: true,
  },
  host: {
    type: String,
  },
  userAgent: {
    type: String,
  },
  status: {
    type: String,
    enum: ['allowed', 'blocked', 'rate_limited', 'anomaly'],
    default: 'allowed',
    index: true,
  },
  statusCode: {
    type: Number,
  },
  responseTime: {
    type: Number, // ms
  },
  blockedReason: {
    type: String,
  },
  ruleTriggered: {
    type: String,
  },
  geoCountry: {
    type: String,
    default: 'Unknown',
  },
  bytesTransferred: {
    type: Number,
    default: 0,
  },
  isAnomaly: {
    type: Boolean,
    default: false,
    index: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
}, { timestamps: false });

// TTL index: auto-delete logs older than 30 days
RequestLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 2592000 });

// Compound index for IP + time range queries
RequestLogSchema.index({ ip: 1, timestamp: -1 });

module.exports = mongoose.model('RequestLog', RequestLogSchema);
>>>>>>> 347fe220f0110165290338289b01bc13e966bdc5
