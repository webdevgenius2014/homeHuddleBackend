// src/middleware/authMiddleware.js
const jwt = require("jsonwebtoken");
const { responseOnFailure, HTTP_STATUS } = require("../helpers/responseHelper");
const User = require("../models/User");

/**
 * Middleware to protect routes - verifies JWT token
 */
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    let token;

    if (authHeader && authHeader.startsWith("Bearer")) {
      token = authHeader.split(" ")[1];
    }

    if (!token) {
      return responseOnFailure(
        res,
        HTTP_STATUS.UNAUTHORIZED,
        "Not authorized to access this route"
      );
    }

    // Check if the token is blacklisted (in cookies)
    const blockedTokens = req.cookies.blockedTokens
      ? JSON.parse(req.cookies.blockedTokens)
      : [];
    if (blockedTokens.includes(token)) {
      return responseOnFailure(
        res,
        HTTP_STATUS.UNAUTHORIZED,
        "Your session has been logged out"
      );
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from database
    const user = await User.findById(decoded.id).populate("role");

    if (!user) {
      return responseOnFailure(res, HTTP_STATUS.UNAUTHORIZED, "User not found");
    }

    if (!user.isActive) {
      return responseOnFailure(
        res,
        HTTP_STATUS.FORBIDDEN,
        "Your account is inactive"
      );
    }

    req.user = user;
    next();
  } catch (error) {
    return responseOnFailure(
      res,
      HTTP_STATUS.UNAUTHORIZED,
      "Token is invalid or expired"
    );
  }
};

/**
 * Restrict access based on user roles
 * @param {...String} roles - Roles allowed to access the route
 */
const restrictTo = (...roles) => {
  return (req, res, next) => {
    // Check if user has required role
    if (!roles.includes(req.user.role.name)) {
      return responseOnFailure(
        res,
        HTTP_STATUS.FORBIDDEN,
        "You do not have permission to perform this action"
      );
    }
    next();
  };
};

module.exports = {
  protect,
  restrictTo,
};
