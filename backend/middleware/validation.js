// middleware/validation.js
// Input validation using express-validator

const { body, validationResult } = require('express-validator');
const { sendError } = require('../utils/response');

/**
 * Process validation results and return errors if any
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendError(res, 'Validation failed', 422, errors.array().map(e => ({ field: e.path, message: e.msg })));
  }
  next();
};

// Auth validation rules
const registerRules = [
  body('username').trim().isLength({ min: 3, max: 30 }).withMessage('Username must be 3-30 characters').matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, underscores'),
  body('email').isEmail().normalizeEmail().withMessage('Enter a valid email address'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters').matches(/\d/).withMessage('Password must contain at least one number'),
  body('role').optional().isIn(['admin', 'user']).withMessage('Role must be admin or user'),
];

const loginRules = [
  body('email').isEmail().normalizeEmail().withMessage('Enter a valid email address'),
  body('password').notEmpty().withMessage('Password is required'),
];

// Firewall rule validation
const blockIPRules = [
  body('ip').trim().notEmpty().withMessage('IP address is required').matches(/^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/).withMessage('Enter a valid IPv4 address or CIDR range'),
  body('reason').optional().isLength({ max: 500 }).withMessage('Reason too long'),
];

const blockDomainRules = [
  body('domain').trim().notEmpty().withMessage('Domain is required').matches(/^[a-zA-Z0-9][a-zA-Z0-9\-\.]+[a-zA-Z]{2,}$/).withMessage('Enter a valid domain name'),
  body('reason').optional().isLength({ max: 500 }).withMessage('Reason too long'),
];

module.exports = {
  validate,
  registerRules,
  loginRules,
  blockIPRules,
  blockDomainRules,
};
