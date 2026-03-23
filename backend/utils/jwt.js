// utils/jwt.js
// JWT token generation and verification helpers

const jwt = require('jsonwebtoken');

/**
 * Generate JWT token for authenticated user
 */
const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '24h',
    issuer: 'ai-firewall-system',
    audience: 'firewall-client',
  });
};

/**
 * Verify and decode JWT token
 */
const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET, {
    issuer: 'ai-firewall-system',
    audience: 'firewall-client',
  });
};

/**
 * Decode token without verification (for expired token info)
 */
const decodeToken = (token) => {
  return jwt.decode(token);
};

module.exports = { generateToken, verifyToken, decodeToken };
