const FirewallRule = require("../models/FirewallRule");
const RequestLog = require("../models/RequestLog");
const { analyzeRequest } = require("../utils/anomalyDetector");
const { sendBlocked } = require("../utils/response");

let ruleCache = { blockedIPs: new Set(), blockedDomains: new Set(), allowedIPs: new Set(), lastRefresh: 0 };
const CACHE_TTL = 30000;

const refreshRuleCache = async () => {
  try {
    const rules = await FirewallRule.find({ isActive: true }).lean();
    const newCache = { blockedIPs: new Set(), blockedDomains: new Set(), allowedIPs: new Set(), lastRefresh: Date.now() };
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
    return originalSend(body);
  };

  next();
};

refreshRuleCache();
setInterval(refreshRuleCache, CACHE_TTL);

module.exports = { firewallMiddleware, refreshRuleCache, getClientIP };
