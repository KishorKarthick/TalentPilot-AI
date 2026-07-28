class ApiError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    if (details) this.details = details;
    Error.captureStackTrace(this, ApiError);
  }
}

module.exports = ApiError;
