// utils/anomalyDetector.js
// AI-powered anomaly detection engine using sliding window analysis

const Alert = require('../models/Alert');
const FirewallRule = require('../models/FirewallRule');

// In-memory sliding window: { ip -> [timestamps] }
const requestWindows = new Map();
const endpointTrackers = new Map(); // { ip -> Set of unique endpoints }
const failedAuthTracker = new Map(); // { ip -> [timestamps] }

// Configuration thresholds
const THRESHOLDS = {
  BURST_REQUESTS: parseInt(process.env.ANOMALY_BURST_THRESHOLD) || 20,
  BURST_WINDOW_SECONDS: parseInt(process.env.ANOMALY_WINDOW_SECONDS) || 10,
  DDOS_REQUESTS: parseInt(process.env.ANOMALY_FLAG_THRESHOLD) || 50,
  DDOS_WINDOW_SECONDS: 60,
  PORT_SCAN_ENDPOINTS: 15,          // Unique endpoints in 30 seconds
  BRUTE_FORCE_ATTEMPTS: 5,          // Failed auth in 60 seconds
  AUTO_BLOCK_CRITICAL: true,        // Auto-block on critical severity
};

/**
 * Cleans timestamps older than the given window from array
 */
const cleanOldTimestamps = (timestamps, windowSeconds) => {
  const cutoff = Date.now() - (windowSeconds * 1000);
  return timestamps.filter(ts => ts > cutoff);
};

/**
 * Core anomaly analysis for an IP address
 * Returns { isAnomaly, type, severity, description, metadata }
 */
const analyzeRequest = async (ip, endpoint, method, userAgent) => {
  const now = Date.now();

  // --- Update sliding window for IP ---
  if (!requestWindows.has(ip)) requestWindows.set(ip, []);
  const ipTimestamps = cleanOldTimestamps(requestWindows.get(ip), THRESHOLDS.DDOS_WINDOW_SECONDS);
  ipTimestamps.push(now);
  requestWindows.set(ip, ipTimestamps);

  // --- Track unique endpoints (port scan detection) ---
  if (!endpointTrackers.has(ip)) endpointTrackers.set(ip, { timestamps: [], endpoints: new Set() });
  const epTracker = endpointTrackers.get(ip);
  epTracker.timestamps = cleanOldTimestamps(epTracker.timestamps, 30);
  epTracker.timestamps.push(now);
  epTracker.endpoints.add(endpoint);

  // Prune endpoint set based on time (approximate)
  if (epTracker.timestamps.length === 0) epTracker.endpoints.clear();

  // --- Burst detection (high freq in short window) ---
  const burstWindow = cleanOldTimestamps(ipTimestamps, THRESHOLDS.BURST_WINDOW_SECONDS);
  if (burstWindow.length >= THRESHOLDS.BURST_REQUESTS) {
    const severity = burstWindow.length >= THRESHOLDS.DDOS_REQUESTS ? 'critical' : 'high';
    return createAnomaly('burst_traffic', severity, ip, endpoint, {
      requestCount: burstWindow.length,
      windowSeconds: THRESHOLDS.BURST_WINDOW_SECONDS,
      threshold: THRESHOLDS.BURST_REQUESTS,
      userAgent,
    }, `Burst traffic: ${burstWindow.length} requests in ${THRESHOLDS.BURST_WINDOW_SECONDS}s`);
  }

  // --- DDoS detection (sustained high volume) ---
  const ddosWindow = cleanOldTimestamps(ipTimestamps, THRESHOLDS.DDOS_WINDOW_SECONDS);
  if (ddosWindow.length >= THRESHOLDS.DDOS_REQUESTS) {
    return createAnomaly('ddos_attempt', 'critical', ip, endpoint, {
      requestCount: ddosWindow.length,
      windowSeconds: THRESHOLDS.DDOS_WINDOW_SECONDS,
      threshold: THRESHOLDS.DDOS_REQUESTS,
      userAgent,
    }, `Possible DDoS: ${ddosWindow.length} requests in ${THRESHOLDS.DDOS_WINDOW_SECONDS}s`);
  }

  // --- Port scan / endpoint probing detection ---
  if (epTracker.endpoints.size >= THRESHOLDS.PORT_SCAN_ENDPOINTS) {
    const endpoints = Array.from(epTracker.endpoints).slice(0, 10);
    return createAnomaly('port_scan', 'high', ip, endpoint, {
      requestCount: epTracker.timestamps.length,
      windowSeconds: 30,
      endpoints,
      threshold: THRESHOLDS.PORT_SCAN_ENDPOINTS,
      userAgent,
    }, `Endpoint probing: ${epTracker.endpoints.size} unique endpoints accessed`);
  }

  // --- Suspicious payload patterns in endpoint ---
  const suspiciousPatterns = [
    /(\.\.|\/\/)/,           // Path traversal
    /<script/i,              // XSS attempt
    /union.*select/i,        // SQL injection
    /exec\s*\(/i,            // Command injection
    /\beval\b/i,             // Code eval
    /etc\/passwd/i,          // File inclusion
    /\x00/,                  // Null byte injection
  ];
  const isSuspiciousPayload = suspiciousPatterns.some(p => p.test(endpoint));
  if (isSuspiciousPayload) {
    return createAnomaly('suspicious_payload', 'critical', ip, endpoint, {
      requestCount: 1,
      endpoints: [endpoint],
      userAgent,
    }, `Suspicious payload detected in request: ${endpoint.substring(0, 80)}`);
  }

  return { isAnomaly: false };
};

/**
 * Track failed authentication attempts
 */
const trackFailedAuth = async (ip) => {
  const now = Date.now();
  if (!failedAuthTracker.has(ip)) failedAuthTracker.set(ip, []);
  const attempts = cleanOldTimestamps(failedAuthTracker.get(ip), 60);
  attempts.push(now);
  failedAuthTracker.set(ip, attempts);

  if (attempts.length >= THRESHOLDS.BRUTE_FORCE_ATTEMPTS) {
    return createAnomaly('brute_force', 'high', ip, '/auth/login', {
      requestCount: attempts.length,
      windowSeconds: 60,
      threshold: THRESHOLDS.BRUTE_FORCE_ATTEMPTS,
    }, `Brute force: ${attempts.length} failed auth attempts in 60s`);
  }
  return { isAnomaly: false };
};

/**
 * Create and persist an anomaly alert
 */
const createAnomaly = async (type, severity, ip, endpoint, metadata, description) => {
  try {
    // Deduplicate: don't create same alert within 60 seconds
    const recentAlert = await Alert.findOne({
      ip,
      type,
      timestamp: { $gte: new Date(Date.now() - 60000) },
    });

    if (recentAlert) {
      return {
        isAnomaly: true,
        type,
        severity,
        description,
        metadata,
        isDuplicate: true,
      };
    }

    // Persist alert to DB
    const alert = await Alert.create({
      type,
      severity,
      ip,
      description,
      metadata: { ...metadata, endpoints: metadata.endpoints || [endpoint] },
    });

    // Auto-block critical IPs
    if (severity === 'critical' && THRESHOLDS.AUTO_BLOCK_CRITICAL) {
      await autoBlockIP(ip, type, description, alert._id);
      alert.autoBlocked = true;
      await alert.save();
    }

    return { isAnomaly: true, type, severity, description, metadata, alertId: alert._id };
  } catch (err) {
    console.error('Anomaly detector error:', err.message);
    return { isAnomaly: true, type, severity, description, metadata };
  }
};

/**
 * Automatically block an IP after critical anomaly
 */
const autoBlockIP = async (ip, reason, description, alertId) => {
  try {
    // Check if already blocked
    const existing = await FirewallRule.findOne({ type: 'ip_block', value: ip, isActive: true });
    if (existing) return;

    await FirewallRule.create({
      type: 'ip_block',
      value: ip,
      action: 'block',
      reason: `[AUTO-BLOCK] ${description} (Alert: ${alertId})`,
      priority: 200, // High priority
    });

    console.log(`🚫 Auto-blocked IP: ${ip} | Reason: ${reason}`);
  } catch (err) {
    console.error('Auto-block failed:', err.message);
  }
};

/**
 * Get real-time stats from in-memory tracker
 */
const getRealtimeStats = () => {
  const stats = {
    activeTrackedIPs: requestWindows.size,
    topIPs: [],
  };

  // Get top 5 IPs by request count (last 60 seconds)
  const ipCounts = [];
  for (const [ip, timestamps] of requestWindows.entries()) {
    const recent = cleanOldTimestamps(timestamps, 60);
    if (recent.length > 0) ipCounts.push({ ip, count: recent.length });
  }
  stats.topIPs = ipCounts.sort((a, b) => b.count - a.count).slice(0, 5);

  return stats;
};

module.exports = { analyzeRequest, trackFailedAuth, getRealtimeStats };
