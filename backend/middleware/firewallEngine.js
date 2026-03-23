<<<<<<< HEAD
﻿const FirewallRule = require("../models/FirewallRule");
const RequestLog = require("../models/RequestLog");
const { analyzeRequest } = require("../utils/anomalyDetector");
const { sendBlocked } = require("../utils/response");

let ruleCache = { blockedIPs: new Set(), blockedDomains: new Set(), allowedIPs: new Set(), lastRefresh: 0 };
const CACHE_TTL = 30000;

=======
// middleware/firewallEngine.js
// 🔥 Core Firewall Middleware Engine
// Processes every incoming request through:
// 1. IP block check
// 2. Domain block check
// 3. Rule engine (allow/deny)
// 4. Anomaly detection
// 5. Request logging

const FirewallRule = require('../models/FirewallRule');
const RequestLog = require('../models/RequestLog');
const { analyzeRequest } = require('../utils/anomalyDetector');
const { sendBlocked } = require('../utils/response');

// Cache rules in memory to avoid DB hit on every request
// Refresh every 30 seconds
let ruleCache = { blockedIPs: new Set(), blockedDomains: new Set(), allowedIPs: new Set(), lastRefresh: 0 };
const CACHE_TTL = 30000; // 30 seconds

/**
 * Load active firewall rules into memory cache
 */
>>>>>>> 347fe220f0110165290338289b01bc13e966bdc5
const refreshRuleCache = async () => {
  try {
    const rules = await FirewallRule.find({ isActive: true }).lean();
    const newCache = { blockedIPs: new Set(), blockedDomains: new Set(), allowedIPs: new Set(), lastRefresh: Date.now() };
<<<<<<< HEAD
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
=======

    for (const rule of rules) {
      switch (rule.type) {
        case 'ip_block': newCache.blockedIPs.add(rule.value); break;
        case 'domain_block': newCache.blockedDomains.add(rule.value.toLowerCase()); break;
        case 'ip_allow': newCache.allowedIPs.add(rule.value); break;
      }
    }

    ruleCache = newCache;
    return rules;
  } catch (err) {
    console.error('Rule cache refresh failed:', err.message);
    return [];
  }
};

/**
 * Increment hit count for a matched rule
 */
const incrementRuleHit = async (type, value) => {
  try {
    await FirewallRule.findOneAndUpdate(
      { type, value, isActive: true },
      { $inc: { hitCount: 1 }, lastTriggered: new Date() }
    );
  } catch (_) {}
};

/**
 * Log the request to database (non-blocking)
 */
const logRequest = async (logData) => {
  try {
    await RequestLog.create(logData);
  } catch (err) {
    // Logging should never break the app
    console.error('Log write failed:', err.message);
  }
};

/**
 * Extract real client IP (handles proxies)
 */
const getClientIP = (req) => {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    '0.0.0.0'
  ).replace('::ffff:', '');
};

/**
 * Main Firewall Middleware
 * Attached globally to intercept ALL requests
 */
const firewallMiddleware = async (req, res, next) => {
  const startTime = Date.now();
  const ip = getClientIP(req);
  const host = req.headers.host || '';
  const endpoint = req.path;
  const method = req.method;
  const userAgent = req.headers['user-agent'] || 'Unknown';

  // Attach IP to request for downstream use
  req.clientIP = ip;

  // Refresh cache if stale
  if (Date.now() - ruleCache.lastRefresh > CACHE_TTL) {
    await refreshRuleCache();
  }

  // ── RULE 1: IP Whitelist (bypass all other rules) ──
  if (ruleCache.allowedIPs.has(ip)) {
    return next();
  }

  // ── RULE 2: IP Block Check ──
  if (ruleCache.blockedIPs.has(ip)) {
    const responseTime = Date.now() - startTime;
    logRequest({ ip, method, endpoint, host, userAgent, status: 'blocked', statusCode: 403, responseTime, blockedReason: 'IP blocked', ruleTriggered: `ip_block:${ip}` });
    incrementRuleHit('ip_block', ip);
    return sendBlocked(res, `IP address ${ip} is blocked`, `ip_block:${ip}`);
  }

  // ── RULE 3: Domain Block Check ──
  const hostDomain = host.split(':')[0].toLowerCase();
  let domainBlocked = false;
  for (const blockedDomain of ruleCache.blockedDomains) {
    if (hostDomain === blockedDomain || hostDomain.endsWith(`.${blockedDomain}`)) {
      domainBlocked = true;
      const responseTime = Date.now() - startTime;
      logRequest({ ip, method, endpoint, host, userAgent, status: 'blocked', statusCode: 403, responseTime, blockedReason: `Domain ${blockedDomain} blocked`, ruleTriggered: `domain_block:${blockedDomain}` });
      incrementRuleHit('domain_block', blockedDomain);
      return sendBlocked(res, `Domain ${hostDomain} is blocked`, `domain_block:${blockedDomain}`);
    }
  }

  // ── RULE 4: Anomaly Detection ──
  const anomaly = await analyzeRequest(ip, endpoint, method, userAgent);

  if (anomaly.isAnomaly && !anomaly.isDuplicate) {
    const responseTime = Date.now() - startTime;

    // Critical anomalies are hard-blocked immediately
    if (anomaly.severity === 'critical') {
      logRequest({ ip, method, endpoint, host, userAgent, status: 'anomaly', statusCode: 403, responseTime, blockedReason: anomaly.description, isAnomaly: true });
      return sendBlocked(res, `Anomaly detected: ${anomaly.description}`, anomaly.type);
    }

    // Non-critical: log and allow but flag
    req.anomalyDetected = anomaly;
    logRequest({ ip, method, endpoint, host, userAgent, status: 'anomaly', statusCode: null, responseTime, isAnomaly: true, blockedReason: anomaly.description });
  }

  // ── RULE 5: Intercept response to log status ──
  const originalSend = res.send.bind(res);
  res.send = function (body) {
    const responseTime = Date.now() - startTime;
    // Only log allowed (non-anomaly) requests here
    if (!anomaly.isAnomaly) {
      logRequest({ ip, method, endpoint, host, userAgent, status: 'allowed', statusCode: res.statusCode, responseTime });
    }
>>>>>>> 347fe220f0110165290338289b01bc13e966bdc5
    return originalSend(body);
  };

  next();
};

<<<<<<< HEAD
refreshRuleCache();
=======
// Initial cache load
refreshRuleCache();

// Periodic refresh
>>>>>>> 347fe220f0110165290338289b01bc13e966bdc5
setInterval(refreshRuleCache, CACHE_TTL);

module.exports = { firewallMiddleware, refreshRuleCache, getClientIP };
