// helpers/responseHelper.js

/**
 * Standard response format for API success responses
 * @param {Object} res - Express response object
 * @param {number} statusCode - HTTP status code (default: 200)
 * @param {string} message - Success message
 * @param {Object|Array|null} data - Response data
 * @param {boolean} success - Success flag (default: true)
 * @returns {Object} Express response
 */
const responseOnSuccess = (
  res,
  statusCode = 200,
  message = "Operation successful",
  data = null,
  success = true
) => {
  return res.status(statusCode).json({
    success,
    message,
    data,
    error: null,
  });
};

/**
 * Standard response format for API error responses
 * @param {Object} res - Express response object
 * @param {number} statusCode - HTTP status code (default: 500)
 * @param {string} message - Error message
 * @param {Object|null} errors - Detailed error information
 * @param {boolean} success - Success flag (default: false)
 * @returns {Object} Express response
 */
const responseOnFailure = (
  res,
  statusCode = 500,
  message = "Operation failed",
  errors = null,
  success = false
) => {
  return res.status(statusCode).json({
    success,
    message,
    data: null,
    error: errors,
  });
};

/**
 * HTTP Status Code constants for common errors
 */
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

module.exports = {
  responseOnSuccess,
  responseOnFailure,
  HTTP_STATUS,
};
