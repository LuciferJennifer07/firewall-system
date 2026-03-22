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
