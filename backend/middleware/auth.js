<<<<<<< HEAD
﻿const { verifyToken } = require("../utils/jwt");
const { sendError } = require("../utils/response");
const User = require("../models/User");

const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }
    if (!token) return sendError(res, "Access denied. No token provided.", 401);
    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id).select("-password");
    if (!user) return sendError(res, "User no longer exists.", 401);
    if (!user.isActive) return sendError(res, "Account deactivated.", 401);
    req.user = user;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") return sendError(res, "Token expired.", 401);
    return sendError(res, "Invalid token.", 401);
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!req.user) return sendError(res, "Not authenticated.", 401);
  if (!roles.includes(req.user.role)) return sendError(res, "Access denied. Insufficient role.", 403);
  next();
=======
// middleware/auth.js
// JWT authentication and role-based access control middleware

const { verifyToken } = require('../utils/jwt');
const { sendError } = require('../utils/response');
const User = require('../models/User');

/**
 * Protect routes: require valid JWT
 */
const protect = async (req, res, next) => {
  try {
    let token;

    // Extract token from Authorization header or cookie
    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return sendError(res, 'Access denied. No token provided.', 401);
    }

    // Verify token
    const decoded = verifyToken(token);

    // Fetch user from DB (ensures user still exists and is active)
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return sendError(res, 'Token invalid: user no longer exists.', 401);
    }

    if (!user.isActive) {
      return sendError(res, 'Account has been deactivated.', 401);
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return sendError(res, 'Token has expired. Please login again.', 401);
    }
    if (error.name === 'JsonWebTokenError') {
      return sendError(res, 'Invalid token.', 401);
    }
    return sendError(res, 'Authentication failed.', 401);
  }
};

/**
 * Role-based access: restrict to specific roles
 * Usage: authorize('admin') or authorize('admin', 'user')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 'Not authenticated.', 401);
    }
    if (!roles.includes(req.user.role)) {
      return sendError(res, `Access denied. Required role: ${roles.join(' or ')}. Your role: ${req.user.role}`, 403);
    }
    next();
  };
>>>>>>> 347fe220f0110165290338289b01bc13e966bdc5
};

module.exports = { protect, authorize };
