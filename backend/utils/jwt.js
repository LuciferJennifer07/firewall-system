const jwt = require("jsonwebtoken");

const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "24h",
    issuer: "ai-firewall-system",
    audience: "firewall-client",
  });
};

const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET, {
    issuer: "ai-firewall-system",
    audience: "firewall-client",
  });
};

module.exports = { generateToken, verifyToken };
