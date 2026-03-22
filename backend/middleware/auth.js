const { verifyToken } = require("../utils/jwt");
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
};

module.exports = { protect, authorize };
