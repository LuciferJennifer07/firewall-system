const { body, validationResult } = require("express-validator");
const { sendError } = require("../utils/response");

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return sendError(res, "Validation failed", 422, errors.array().map(e => ({ field: e.path, message: e.msg })));
  next();
};

const registerRules = [
  body("username").trim().isLength({ min: 3, max: 30 }).withMessage("Username must be 3-30 characters"),
  body("email").isEmail().normalizeEmail().withMessage("Valid email required"),
  body("password").isLength({ min: 6 }).withMessage("Password min 6 chars").matches(/\d/).withMessage("Password needs a number"),
];

const loginRules = [
  body("email").isEmail().normalizeEmail().withMessage("Valid email required"),
  body("password").notEmpty().withMessage("Password required"),
];

const blockIPRules = [
  body("ip").trim().notEmpty().withMessage("IP required").matches(/^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/).withMessage("Valid IPv4 required"),
];

const blockDomainRules = [
  body("domain").trim().notEmpty().withMessage("Domain required"),
];

module.exports = { validate, registerRules, loginRules, blockIPRules, blockDomainRules };
