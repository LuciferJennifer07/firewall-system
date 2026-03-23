// controllers/dataController.js
// Protected API endpoints that pass through the firewall

const { sendSuccess } = require('../utils/response');

/**
 * GET /api/data
 * Sample protected endpoint - returns data if user is authenticated and not blocked
 */
const getData = async (req, res) => {
  const anomalyWarning = req.anomalyDetected
    ? { warning: 'Anomaly detected in your traffic pattern', type: req.anomalyDetected.type }
    : null;

  return sendSuccess(res, {
    message: 'Welcome to the secured API',
    user: req.user ? { id: req.user._id, username: req.user.username, role: req.user.role } : 'guest',
    serverTime: new Date().toISOString(),
    ip: req.clientIP,
    ...(anomalyWarning && { anomalyWarning }),
    sampleData: {
      records: [
        { id: 1, name: 'Secure Record Alpha', value: 42 },
        { id: 2, name: 'Secure Record Beta', value: 87 },
        { id: 3, name: 'Secure Record Gamma', value: 13 },
      ],
    },
  }, 'Data retrieved successfully');
};

/**
 * GET /api/public
 * Public endpoint (no auth needed, but firewall still applies)
 */
const getPublicData = async (req, res) => {
  return sendSuccess(res, {
    message: 'This is a public endpoint protected by the firewall',
    ip: req.clientIP,
    timestamp: new Date().toISOString(),
    status: 'Firewall active',
  }, 'Public data');
};

module.exports = { getData, getPublicData };
