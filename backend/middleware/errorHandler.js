const multer = require('multer');

const MULTER_MESSAGES = {
  LIMIT_FILE_SIZE: 'File is larger than the 10MB limit',
  LIMIT_FILE_COUNT: 'Too many files uploaded (max 100)',
  LIMIT_UNEXPECTED_FILE: 'Unexpected file field',
};

// Maps known error shapes to HTTP status codes and safe client messages.
const classify = (err) => {
  if (err instanceof multer.MulterError) {
    return { statusCode: err.code === 'LIMIT_FILE_SIZE' ? 413 : 400, message: MULTER_MESSAGES[err.code] || err.message };
  }
  if (err.name === 'ValidationError' && err.errors) {
    return {
      statusCode: 400,
      message: 'Validation failed',
      details: Object.values(err.errors).map((e) => ({ field: e.path, message: e.message })),
    };
  }
  if (err.name === 'CastError') {
    return { statusCode: 400, message: `Invalid value for '${err.path}'` };
  }
  if (err.code === 11000) {
    return { statusCode: 409, message: `Duplicate value for '${Object.keys(err.keyPattern || {}).join(', ')}'` };
  }
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return { statusCode: 401, message: 'Invalid or expired token' };
  }
  if (err.statusCode) {
    return { statusCode: err.statusCode, message: err.message, details: err.details };
  }
  return { statusCode: 500, message: 'Internal Server Error' };
};

// eslint-disable-next-line no-unused-vars -- Express identifies error handlers by arity
const errorHandler = (err, req, res, next) => {
  const { statusCode, message, details } = classify(err);

  // Always log the full error server-side; clients only ever see `message`.
  const log = statusCode >= 500 ? console.error : console.warn;
  log(`[${req.method} ${req.originalUrl}] ${statusCode} ${err.name || 'Error'}: ${err.message}`);
  if (statusCode >= 500) console.error(err.stack);

  res.status(statusCode).json({ success: false, message, ...(details ? { details } : {}) });
};

module.exports = errorHandler;
