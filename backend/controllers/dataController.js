const { sendSuccess } = require("../utils/response");

const getData = async (req, res) => {
  return sendSuccess(res, {
    message: "Welcome to the secured API",
    user: req.user ? { id: req.user._id, username: req.user.username, role: req.user.role } : "guest",
    serverTime: new Date().toISOString(),
    ip: req.clientIP,
    sampleData: { records: [{ id: 1, name: "Secure Record Alpha", value: 42 }, { id: 2, name: "Secure Record Beta", value: 87 }] },
  }, "Data retrieved successfully");
};

const getPublicData = async (req, res) => {
  return sendSuccess(res, { message: "Public endpoint — firewall active", ip: req.clientIP, timestamp: new Date().toISOString() }, "Public data");
};

module.exports = { getData, getPublicData };
