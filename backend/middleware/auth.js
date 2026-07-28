const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  const token = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.split(' ')[1]
    : null;

  if (!token) return res.status(401).json({ success: false, message: 'Not authorized' });

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    console.warn(`Token verification failed (${err.name}): ${err.message}`);
    const expired = err.name === 'TokenExpiredError';
    return res.status(401).json({ success: false, message: expired ? 'Token expired' : 'Invalid token' });
  }

  // Lookup failures (e.g. database down) must surface as 500, not as "invalid token".
  req.user = await User.findById(decoded.id).select('-password');
  if (!req.user || !req.user.isActive)
    return res.status(401).json({ success: false, message: 'User not found or inactive' });
  next();
};

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role))
    return res.status(403).json({ success: false, message: 'Access denied' });
  next();
};

module.exports = { protect, authorize };
