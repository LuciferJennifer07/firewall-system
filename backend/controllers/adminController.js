<<<<<<< HEAD
﻿const FirewallRule = require("../models/FirewallRule");
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

=======
// controllers/adminController.js
// Admin operations: manage rules, view logs, alerts, stats

const FirewallRule = require('../models/FirewallRule');
const RequestLog = require('../models/RequestLog');
const Alert = require('../models/Alert');
const { sendSuccess, sendError } = require('../utils/response');
const { refreshRuleCache, getRealtimeStats } = require('../middleware/firewallEngine');
const anomalyDetector = require('../utils/anomalyDetector');

// ══════════════════════════════════════════
//  IP & DOMAIN MANAGEMENT
// ══════════════════════════════════════════

/**
 * POST /admin/block/ip
 * Block an IP address
 */
const blockIP = async (req, res) => {
  try {
    const { ip, reason, expiresAt } = req.body;

    // Check if already blocked
    const existing = await FirewallRule.findOne({ type: 'ip_block', value: ip, isActive: true });
    if (existing) {
      return sendError(res, `IP ${ip} is already blocked`, 409);
    }

    const rule = await FirewallRule.create({
      type: 'ip_block',
      value: ip,
      action: 'block',
      reason: reason || 'Manual block by admin',
      expiresAt: expiresAt || null,
      createdBy: req.user._id,
      priority: 150,
    });

    // Refresh cache immediately
    await refreshRuleCache();

    return sendSuccess(res, { rule }, `IP ${ip} blocked successfully`, 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * POST /admin/block/domain
 * Block a domain
 */
const blockDomain = async (req, res) => {
  try {
    const { domain, reason } = req.body;
    const normalizedDomain = domain.toLowerCase().trim();

    const existing = await FirewallRule.findOne({ type: 'domain_block', value: normalizedDomain, isActive: true });
    if (existing) {
      return sendError(res, `Domain ${normalizedDomain} is already blocked`, 409);
    }

    const rule = await FirewallRule.create({
      type: 'domain_block',
      value: normalizedDomain,
      action: 'block',
      reason: reason || 'Manual domain block by admin',
      createdBy: req.user._id,
      priority: 150,
    });

    await refreshRuleCache();

    return sendSuccess(res, { rule }, `Domain ${normalizedDomain} blocked successfully`, 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * DELETE /admin/rules/:id
 * Remove/deactivate a firewall rule
 */
const removeRule = async (req, res) => {
  try {
    const rule = await FirewallRule.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!rule) return sendError(res, 'Rule not found', 404);

    await refreshRuleCache();

    return sendSuccess(res, { rule }, 'Rule deactivated successfully');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * GET /admin/rules
 * List all firewall rules with pagination
 */
const getRules = async (req, res) => {
  try {
    const { page = 1, limit = 50, type, isActive = 'true' } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (isActive !== 'all') filter.isActive = isActive === 'true';

    const rules = await FirewallRule.find(filter)
      .populate('createdBy', 'username')
      .sort({ priority: -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await FirewallRule.countDocuments(filter);

    return sendSuccess(res, { rules, total, page: parseInt(page), pages: Math.ceil(total / limit) }, 'Rules retrieved');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// ══════════════════════════════════════════
//  LOGS
// ══════════════════════════════════════════

/**
 * GET /admin/logs
 * Retrieve request logs with filters
 */
const getLogs = async (req, res) => {
  try {
    const { page = 1, limit = 100, status, ip, startDate, endDate, isAnomaly } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (ip) filter.ip = { $regex: ip };
    if (isAnomaly === 'true') filter.isAnomaly = true;
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    const logs = await RequestLog.find(filter)
      .sort({ timestamp: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await RequestLog.countDocuments(filter);

    return sendSuccess(res, { logs, total, page: parseInt(page), pages: Math.ceil(total / limit) }, 'Logs retrieved');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// ══════════════════════════════════════════
//  ALERTS
// ══════════════════════════════════════════

/**
 * GET /admin/alerts
 * Get anomaly detection alerts
 */
const getAlerts = async (req, res) => {
  try {
    const { page = 1, limit = 50, severity, isResolved = 'false', type } = req.query;

    const filter = {};
    if (severity) filter.severity = severity;
    if (type) filter.type = type;
    if (isResolved !== 'all') filter.isResolved = isResolved === 'true';

    const alerts = await Alert.find(filter)
      .sort({ timestamp: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Alert.countDocuments(filter);
    const criticalCount = await Alert.countDocuments({ severity: 'critical', isResolved: false });

    return sendSuccess(res, { alerts, total, criticalCount, page: parseInt(page), pages: Math.ceil(total / limit) }, 'Alerts retrieved');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * PATCH /admin/alerts/:id/resolve
 * Mark an alert as resolved
 */
const resolveAlert = async (req, res) => {
  try {
    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      { isResolved: true, resolvedAt: new Date(), resolvedBy: req.user._id },
      { new: true }
    );
    if (!alert) return sendError(res, 'Alert not found', 404);

    return sendSuccess(res, { alert }, 'Alert resolved');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// ══════════════════════════════════════════
//  DASHBOARD STATS
// ══════════════════════════════════════════

/**
 * GET /admin/stats
 * Aggregated dashboard statistics
 */
>>>>>>> 347fe220f0110165290338289b01bc13e966bdc5
const getStats = async (req, res) => {
  try {
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const last1h = new Date(Date.now() - 60 * 60 * 1000);
<<<<<<< HEAD
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
=======

    const [
      totalRequests,
      blockedRequests,
      anomalyRequests,
      activeRules,
      unresolvedAlerts,
      criticalAlerts,
      recentRequests,
      topBlockedIPs,
      trafficByHour,
    ] = await Promise.all([
      RequestLog.countDocuments({ timestamp: { $gte: last24h } }),
      RequestLog.countDocuments({ timestamp: { $gte: last24h }, status: 'blocked' }),
      RequestLog.countDocuments({ timestamp: { $gte: last24h }, isAnomaly: true }),
      FirewallRule.countDocuments({ isActive: true }),
      Alert.countDocuments({ isResolved: false }),
      Alert.countDocuments({ isResolved: false, severity: 'critical' }),
      RequestLog.countDocuments({ timestamp: { $gte: last1h } }),
      // Top blocked IPs
      RequestLog.aggregate([
        { $match: { status: 'blocked', timestamp: { $gte: last24h } } },
        { $group: { _id: '$ip', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
        { $project: { ip: '$_id', count: 1, _id: 0 } },
      ]),
      // Traffic by hour (last 12 hours)
      RequestLog.aggregate([
        { $match: { timestamp: { $gte: new Date(Date.now() - 12 * 60 * 60 * 1000) } } },
        { $group: {
          _id: { $dateToString: { format: '%H:00', date: '$timestamp' } },
          total: { $sum: 1 },
          blocked: { $sum: { $cond: [{ $eq: ['$status', 'blocked'] }, 1, 0] } },
          allowed: { $sum: { $cond: [{ $eq: ['$status', 'allowed'] }, 1, 0] } },
        }},
        { $sort: { '_id': 1 } },
      ]),
    ]);

    const realtimeStats = anomalyDetector.getRealtimeStats();

    return sendSuccess(res, {
      summary: {
        totalRequests,
        blockedRequests,
        allowedRequests: totalRequests - blockedRequests - anomalyRequests,
        anomalyRequests,
        blockRate: totalRequests > 0 ? ((blockedRequests / totalRequests) * 100).toFixed(1) : 0,
        activeRules,
        unresolvedAlerts,
        criticalAlerts,
        recentRequests,
      },
      topBlockedIPs,
      trafficByHour,
      realtime: realtimeStats,
    }, 'Stats retrieved');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * POST /admin/simulate/attack
 * Simulate attack for demo purposes (only in development)
 */
const simulateAttack = async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return sendError(res, 'Simulation not available in production', 403);
  }

  const { type = 'burst', targetIP = '10.0.0.1' } = req.body;
  const { analyzeRequest } = require('../utils/anomalyDetector');

  // Simulate burst traffic from a fake IP
  const results = [];
  const count = type === 'ddos' ? 55 : 25;

  for (let i = 0; i < count; i++) {
    const result = await analyzeRequest(targetIP, `/api/endpoint-${i % 5}`, 'GET', 'AttackBot/1.0');
    if (result.isAnomaly && !result.isDuplicate) {
      results.push(result);
    }
  }

  return sendSuccess(res, {
    simulationType: type,
    targetIP,
    requestsSent: count,
    anomaliesDetected: results.length,
    results: results.slice(0, 3),
  }, 'Attack simulation complete');
};

module.exports = {
  blockIP, blockDomain, removeRule, getRules,
  getLogs, getAlerts, resolveAlert, getStats, simulateAttack,
};
>>>>>>> 347fe220f0110165290338289b01bc13e966bdc5
