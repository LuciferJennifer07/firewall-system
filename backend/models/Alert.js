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
