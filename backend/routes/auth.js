const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const ApiError = require('../utils/ApiError');

const router = express.Router();

const generateToken = (id) => {
  if (!process.env.JWT_SECRET) throw new ApiError(500, 'Authentication is misconfigured');
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });
};

router.post('/register', [
  body('name').notEmpty().trim(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const { name, email, password, role, company } = req.body;
  const exists = await User.findOne({ email });
  if (exists) return res.status(400).json({ success: false, message: 'Email already registered' });

  // Block public admin registration — admin role can only be assigned by existing admin
  if (role === 'admin') {
    return res.status(403).json({ success: false, message: 'Admin accounts can only be created by an existing admin.' });
  }

  const user = await User.create({ name, email, password, role: role || 'recruiter', company });
  res.status(201).json({ success: true, token: generateToken(user._id), user });
});

router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.matchPassword(password)))
    return res.status(401).json({ success: false, message: 'Invalid credentials' });

  user.lastLogin = new Date();
  await user.save();

  res.json({ success: true, token: generateToken(user._id), user });
});

router.get('/me', protect, (req, res) => res.json({ success: true, user: req.user }));

router.put('/profile', protect, async (req, res) => {
  const { name, company, avatar } = req.body;
  const user = await User.findByIdAndUpdate(req.user._id, { name, company, avatar }, { new: true, runValidators: true });
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  res.json({ success: true, user });
});

// Admin only — create any role including admin
router.post('/users/create', protect, authorize('admin'), async (req, res) => {
  const { name, email, password, role, company } = req.body;
  if (!name || !email) throw new ApiError(400, 'name and email are required');

  const exists = await User.findOne({ email });
  if (exists) return res.status(400).json({ success: false, message: 'Email already registered' });
  const user = await User.create({ name, email, password: password || 'TalentPilot@123', role, company });
  res.status(201).json({ success: true, user });
});

// Admin only — get all users
router.get('/users', protect, authorize('admin'), async (req, res) => {
  const users = await User.find().sort('-createdAt');
  res.json({ success: true, data: users });
});

// Admin only — update user role or status
router.patch('/users/:id', protect, authorize('admin'), async (req, res) => {
  const { role, isActive } = req.body;
  const update = {};
  if (role) update.role = role;
  if (typeof isActive === 'boolean') update.isActive = isActive;
  if (!Object.keys(update).length) throw new ApiError(400, 'Nothing to update — provide role and/or isActive');

  const user = await User.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  res.json({ success: true, user });
});

module.exports = router;
