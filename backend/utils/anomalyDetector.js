const Alert = require("../models/Alert");
const FirewallRule = require("../models/FirewallRule");

const requestWindows = new Map();
const endpointTrackers = new Map();
const failedAuthTracker = new Map();

const THRESHOLDS = {
  BURST_REQUESTS: parseInt(process.env.ANOMALY_BURST_THRESHOLD) || 20,
  BURST_WINDOW_SECONDS: parseInt(process.env.ANOMALY_WINDOW_SECONDS) || 10,
  DDOS_REQUESTS: parseInt(process.env.ANOMALY_FLAG_THRESHOLD) || 50,
  DDOS_WINDOW_SECONDS: 60,
  PORT_SCAN_ENDPOINTS: 15,
  BRUTE_FORCE_ATTEMPTS: 5,
  AUTO_BLOCK_CRITICAL: true,
};

const cleanOldTimestamps = (timestamps, windowSeconds) => {
  const cutoff = Date.now() - windowSeconds * 1000;
  return timestamps.filter((ts) => ts > cutoff);
};

const analyzeRequest = async (ip, endpoint, method, userAgent) => {
  const now = Date.now();
  if (!requestWindows.has(ip)) requestWindows.set(ip, []);
  const ipTimestamps = cleanOldTimestamps(requestWindows.get(ip), THRESHOLDS.DDOS_WINDOW_SECONDS);
  ipTimestamps.push(now);
  requestWindows.set(ip, ipTimestamps);

  if (!endpointTrackers.has(ip)) endpointTrackers.set(ip, { timestamps: [], endpoints: new Set() });
  const epTracker = endpointTrackers.get(ip);
  epTracker.timestamps = cleanOldTimestamps(epTracker.timestamps, 30);
  epTracker.timestamps.push(now);
  epTracker.endpoints.add(endpoint);

  const burstWindow = cleanOldTimestamps(ipTimestamps, THRESHOLDS.BURST_WINDOW_SECONDS);
  if (burstWindow.length >= THRESHOLDS.BURST_REQUESTS) {
    const severity = burstWindow.length >= THRESHOLDS.DDOS_REQUESTS ? "critical" : "high";
    return createAnomaly("burst_traffic", severity, ip, endpoint, {
      requestCount: burstWindow.length, windowSeconds: THRESHOLDS.BURST_WINDOW_SECONDS,
      threshold: THRESHOLDS.BURST_REQUESTS, userAgent,
    }, "Burst traffic: " + burstWindow.length + " requests in " + THRESHOLDS.BURST_WINDOW_SECONDS + "s");
  }

  const ddosWindow = cleanOldTimestamps(ipTimestamps, THRESHOLDS.DDOS_WINDOW_SECONDS);
  if (ddosWindow.length >= THRESHOLDS.DDOS_REQUESTS) {
    return createAnomaly("ddos_attempt", "critical", ip, endpoint, {
      requestCount: ddosWindow.length, windowSeconds: THRESHOLDS.DDOS_WINDOW_SECONDS, userAgent,
    }, "Possible DDoS: " + ddosWindow.length + " requests in " + THRESHOLDS.DDOS_WINDOW_SECONDS + "s");
  }

  if (epTracker.endpoints.size >= THRESHOLDS.PORT_SCAN_ENDPOINTS) {
    return createAnomaly("port_scan", "high", ip, endpoint, {
      requestCount: epTracker.timestamps.length, windowSeconds: 30,
      endpoints: Array.from(epTracker.endpoints).slice(0, 10), userAgent,
    }, "Endpoint probing: " + epTracker.endpoints.size + " unique endpoints");
  }

  const suspiciousPatterns = [/(\.\.|\/\/)/, /<script/i, /union.*select/i, /exec\s*\(/i, /\beval\b/i, /etc\/passwd/i];
  if (suspiciousPatterns.some((p) => p.test(endpoint))) {
    return createAnomaly("suspicious_payload", "critical", ip, endpoint, {
      requestCount: 1, endpoints: [endpoint], userAgent,
    }, "Suspicious payload detected: " + endpoint.substring(0, 80));
  }

  return { isAnomaly: false };
};

const trackFailedAuth = async (ip) => {
  const now = Date.now();
  if (!failedAuthTracker.has(ip)) failedAuthTracker.set(ip, []);
  const attempts = cleanOldTimestamps(failedAuthTracker.get(ip), 60);
  attempts.push(now);
  failedAuthTracker.set(ip, attempts);
  if (attempts.length >= THRESHOLDS.BRUTE_FORCE_ATTEMPTS) {
    return createAnomaly("brute_force", "high", ip, "/auth/login", {
      requestCount: attempts.length, windowSeconds: 60, threshold: THRESHOLDS.BRUTE_FORCE_ATTEMPTS,
    }, "Brute force: " + attempts.length + " failed auth attempts in 60s");
  }
  return { isAnomaly: false };
};

const createAnomaly = async (type, severity, ip, endpoint, metadata, description) => {
  try {
    const recentAlert = await Alert.findOne({ ip, type, timestamp: { $gte: new Date(Date.now() - 60000) } });
    if (recentAlert) return { isAnomaly: true, type, severity, description, metadata, isDuplicate: true };

    const alert = await Alert.create({ type, severity, ip, description, metadata: { ...metadata, endpoints: metadata.endpoints || [endpoint] } });

    if (severity === "critical" && THRESHOLDS.AUTO_BLOCK_CRITICAL) {
      const existing = await FirewallRule.findOne({ type: "ip_block", value: ip, isActive: true });
      if (!existing) {
        await FirewallRule.create({ type: "ip_block", value: ip, action: "block", reason: "[AUTO-BLOCK] " + description, priority: 200 });
        console.log("Auto-blocked IP:", ip);
      }
      alert.autoBlocked = true;
      await alert.save();
    }
    return { isAnomaly: true, type, severity, description, metadata, alertId: alert._id };
  } catch (err) {
    console.error("Anomaly detector error:", err.message);
    return { isAnomaly: true, type, severity, description, metadata };
  }
};

const getRealtimeStats = () => {
  const ipCounts = [];
  for (const [ip, timestamps] of requestWindows.entries()) {
    const recent = cleanOldTimestamps(timestamps, 60);
    if (recent.length > 0) ipCounts.push({ ip, count: recent.length });
  }
  return { activeTrackedIPs: requestWindows.size, topIPs: ipCounts.sort((a, b) => b.count - a.count).slice(0, 5) };
};

module.exports = { analyzeRequest, trackFailedAuth, getRealtimeStats };
