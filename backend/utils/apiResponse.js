// Standardized JSON response helpers to keep the API envelope consistent.

const sendSuccess = (res, payload = {}, status = 200) =>
  res.status(status).json({ success: true, ...payload });

const sendError = (res, message, status = 400) =>
  res.status(status).json({ success: false, message });

const notFound = (res, resource = 'Resource') =>
  sendError(res, `${resource} not found`, 404);

module.exports = { sendSuccess, sendError, notFound };
