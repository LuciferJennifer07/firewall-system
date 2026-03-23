<<<<<<< HEAD
﻿const User = require("../models/User");
const { generateToken } = require("../utils/jwt");
const { sendSuccess, sendError } = require("../utils/response");
const { trackFailedAuth } = require("../utils/anomalyDetector");

const register = async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) return sendError(res, "User already exists", 409);
    const user = await User.create({ username, email, password, role: role === "admin" ? "admin" : "user" });
    const token = generateToken({ id: user._id, role: user.role, username: user.username });
    return sendSuccess(res, { token, user: { id: user._id, username: user.username, email: user.email, role: user.role } }, "Registration successful", 201);
  } catch (error) {
    if (error.code === 11000) return sendError(res, "User already exists", 409);
=======
// controllers/authController.js
// Handles user registration, login, and profile

const User = require('../models/User');
const { generateToken } = require('../utils/jwt');
const { sendSuccess, sendError } = require('../utils/response');
const { trackFailedAuth } = require('../utils/anomalyDetector');

/**
 * POST /register
 * Register a new user
 */
const register = async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      const field = existingUser.email === email ? 'email' : 'username';
      return sendError(res, `User with this ${field} already exists`, 409);
    }

    // Only allow admin creation if explicitly set (could be locked down in prod)
    const userRole = role === 'admin' ? 'admin' : 'user';

    const user = await User.create({ username, email, password, role: userRole });

    const token = generateToken({ id: user._id, role: user.role, username: user.username });

    return sendSuccess(res, {
      token,
      user: { id: user._id, username: user.username, email: user.email, role: user.role },
    }, 'Registration successful', 201);
  } catch (error) {
    if (error.code === 11000) {
      return sendError(res, 'User already exists', 409);
    }
>>>>>>> 347fe220f0110165290338289b01bc13e966bdc5
    return sendError(res, error.message, 500);
  }
};

<<<<<<< HEAD
=======
/**
 * POST /login
 * Authenticate user and return JWT
 */
>>>>>>> 347fe220f0110165290338289b01bc13e966bdc5
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const ip = req.clientIP || req.ip;
<<<<<<< HEAD
    const user = await User.findOne({ email }).select("+password");
    if (!user) { await trackFailedAuth(ip); return sendError(res, "Invalid credentials", 401); }
    if (user.isLocked()) return sendError(res, "Account locked. Try again later.", 423);
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      user.loginAttempts += 1;
      if (user.loginAttempts >= 5) { user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); user.loginAttempts = 0; }
      await user.save();
      await trackFailedAuth(ip);
      return sendError(res, "Invalid credentials", 401);
    }
    user.loginAttempts = 0; user.lockedUntil = undefined; user.lastLogin = new Date();
    await user.save();
    const token = generateToken({ id: user._id, role: user.role, username: user.username });
    return sendSuccess(res, { token, user: { id: user._id, username: user.username, email: user.email, role: user.role } }, "Login successful");
  } catch (error) { return sendError(res, error.message, 500); }
};

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return sendError(res, "User not found", 404);
    return sendSuccess(res, { id: user._id, username: user.username, email: user.email, role: user.role, lastLogin: user.lastLogin }, "Profile retrieved");
  } catch (error) { return sendError(res, error.message, 500); }
};

const listUsers = async (req, res) => {
  try {
    const users = await User.find({}).select("-password").sort({ createdAt: -1 });
    return sendSuccess(res, { users, total: users.length }, "Users retrieved");
  } catch (error) { return sendError(res, error.message, 500); }
=======

    // Fetch user with password field
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      // Track failed attempt
      await trackFailedAuth(ip);
      return sendError(res, 'Invalid credentials', 401);
    }

    // Check if account is locked
    if (user.isLocked()) {
      return sendError(res, 'Account temporarily locked due to multiple failed attempts. Try again later.', 423);
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      // Increment failed attempts
      user.loginAttempts += 1;
      if (user.loginAttempts >= 5) {
        user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // Lock 15 min
        user.loginAttempts = 0;
      }
      await user.save();
      await trackFailedAuth(ip);
      return sendError(res, 'Invalid credentials', 401);
    }

    // Reset failed attempts on success
    user.loginAttempts = 0;
    user.lockedUntil = undefined;
    user.lastLogin = new Date();
    await user.save();

    const token = generateToken({ id: user._id, role: user.role, username: user.username });

    return sendSuccess(res, {
      token,
      user: { id: user._id, username: user.username, email: user.email, role: user.role, lastLogin: user.lastLogin },
    }, 'Login successful');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * GET /auth/me
 * Get current authenticated user profile
 */
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return sendError(res, 'User not found', 404);

    return sendSuccess(res, {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
    }, 'Profile retrieved');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * GET /auth/users  (Admin only)
 * List all users
 */
const listUsers = async (req, res) => {
  try {
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    return sendSuccess(res, { users, total: users.length }, 'Users retrieved');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
>>>>>>> 347fe220f0110165290338289b01bc13e966bdc5
};

module.exports = { register, login, getProfile, listUsers };
