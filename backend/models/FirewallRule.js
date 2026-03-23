// models/FirewallRule.js
// Stores IP blocks, domain blocks, and custom rules

const mongoose = require('mongoose');

const FirewallRuleSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['ip_block', 'domain_block', 'ip_allow', 'domain_allow', 'rate_limit', 'custom'],
    required: true,
  },
  value: {
    type: String,
    required: [true, 'Rule value is required'],
    trim: true,
  },
  action: {
    type: String,
    enum: ['block', 'allow', 'log', 'throttle'],
    default: 'block',
  },
  reason: {
    type: String,
    default: 'Manual rule',
    maxlength: [500, 'Reason cannot exceed 500 characters'],
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  priority: {
    type: Number,
    default: 100, // Higher = higher priority
  },
  hitCount: {
    type: Number,
    default: 0,
  },
  lastTriggered: {
    type: Date,
  },
  expiresAt: {
    type: Date, // null = permanent
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, { timestamps: true });

// Index for fast lookups
FirewallRuleSchema.index({ type: 1, value: 1, isActive: 1 });
FirewallRuleSchema.index({ isActive: 1, priority: -1 });

// Auto-expire rules
FirewallRuleSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('FirewallRule', FirewallRuleSchema);
