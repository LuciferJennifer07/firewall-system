const sendSuccess = (res, data = {}, message = "Success", statusCode = 200) => {
  return res.status(statusCode).json({ success: true, message, data, timestamp: new Date().toISOString() });
};

const sendError = (res, message = "An error occurred", statusCode = 500, errors = null) => {
  const response = { success: false, message, timestamp: new Date().toISOString() };
  if (errors) response.errors = errors;
  return res.status(statusCode).json(response);
};

const sendBlocked = (res, reason = "Request blocked by firewall", rule = null) => {
  return res.status(403).json({
    success: false,
    message: "BLOCKED: Your request has been denied by the firewall.",
    reason, rule, timestamp: new Date().toISOString(),
  });
};

module.exports = { sendSuccess, sendError, sendBlocked };
