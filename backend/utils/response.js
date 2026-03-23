<<<<<<< HEAD
﻿const sendSuccess = (res, data = {}, message = "Success", statusCode = 200) => {
  return res.status(statusCode).json({ success: true, message, data, timestamp: new Date().toISOString() });
};

const sendError = (res, message = "An error occurred", statusCode = 500, errors = null) => {
  const response = { success: false, message, timestamp: new Date().toISOString() };
=======
// utils/response.js
// Standardized API response helpers

const sendSuccess = (res, data = {}, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  });
};

const sendError = (res, message = 'An error occurred', statusCode = 500, errors = null) => {
  const response = {
    success: false,
    message,
    timestamp: new Date().toISOString(),
  };
>>>>>>> 347fe220f0110165290338289b01bc13e966bdc5
  if (errors) response.errors = errors;
  return res.status(statusCode).json(response);
};

<<<<<<< HEAD
const sendBlocked = (res, reason = "Request blocked by firewall", rule = null) => {
  return res.status(403).json({
    success: false,
    message: "BLOCKED: Your request has been denied by the firewall.",
    reason, rule, timestamp: new Date().toISOString(),
  });
};

module.exports = { sendSuccess, sendError, sendBlocked };
=======
const sendBlocked = (res, reason = 'Request blocked by firewall', rule = null) => {
  return res.status(403).json({
    success: false,
    message: 'BLOCKED: Your request has been denied by the firewall.',
    reason,
    rule,
    timestamp: new Date().toISOString(),
    support: 'Contact admin if you believe this is an error.',
  });
};

const sendRateLimited = (res) => {
  return res.status(429).json({
    success: false,
    message: 'Too many requests. Rate limit exceeded.',
    retryAfter: '60 seconds',
    timestamp: new Date().toISOString(),
  });
};

module.exports = { sendSuccess, sendError, sendBlocked, sendRateLimited };
>>>>>>> 347fe220f0110165290338289b01bc13e966bdc5
