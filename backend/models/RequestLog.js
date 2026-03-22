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
