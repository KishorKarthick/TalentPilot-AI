const express = require('express');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

const ASSIGNABLE_ROLES = ['recruiter', 'hiring_manager', 'admin'];
const PUBLIC_ROLES = ['recruiter', 'hiring_manager'];

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  message: { success: false, message: 'Too many attempts, please try again later' },
});

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });

router.post('/register', authLimiter, [
  body('name').isString().notEmpty().trim(),
  body('email').isEmail().normalizeEmail(),
  body('password').isString().isLength({ min: 8, max: 128 }),
  body('role').optional().isIn(PUBLIC_ROLES),
  body('company').optional().isString().trim(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const { name, email, password, role, company } = req.body;
  const exists = await User.findOne({ email });
  if (exists) return res.status(400).json({ success: false, message: 'Email already registered' });

  const user = await User.create({ name, email, password, role: role || 'recruiter', company });
  res.status(201).json({ success: true, token: generateToken(user._id), user });
});

router.post('/login', authLimiter, [
  body('email').isEmail().normalizeEmail(),
  body('password').isString().notEmpty(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');
  if (!user || !user.isActive || !(await user.matchPassword(password)))
    return res.status(401).json({ success: false, message: 'Invalid credentials' });

  user.lastLogin = new Date();
  await user.save();

  res.json({ success: true, token: generateToken(user._id), user });
});

router.get('/me', protect, (req, res) => res.json({ success: true, user: req.user }));

router.put('/profile', protect, [
  body('name').optional().isString().trim(),
  body('company').optional().isString().trim(),
  body('avatar').optional().isString().trim(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const { name, company, avatar } = req.body;
  const user = await User.findByIdAndUpdate(req.user._id, { name, company, avatar }, { new: true });
  res.json({ success: true, user });
});

// Admin only — create any role including admin
router.post('/users/create', protect, authorize('admin'), [
  body('name').isString().notEmpty().trim(),
  body('email').isEmail().normalizeEmail(),
  body('password').isString().isLength({ min: 8, max: 128 }),
  body('role').isIn(ASSIGNABLE_ROLES),
  body('company').optional().isString().trim(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const { name, email, password, role, company } = req.body;
  const exists = await User.findOne({ email });
  if (exists) return res.status(400).json({ success: false, message: 'Email already registered' });
  const user = await User.create({ name, email, password, role, company });
  res.status(201).json({ success: true, user });
});

// Admin only — get all users
router.get('/users', protect, authorize('admin'), async (req, res) => {
  const users = await User.find().sort('-createdAt');
  res.json({ success: true, data: users });
});

// Admin only — update user role or status
router.patch('/users/:id', protect, authorize('admin'), [
  body('role').optional().isIn(ASSIGNABLE_ROLES),
  body('isActive').optional().isBoolean(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const { role, isActive } = req.body;
  if (req.params.id === String(req.user._id) && (role !== undefined || isActive !== undefined))
    return res.status(400).json({ success: false, message: 'You cannot change your own role or status' });

  const update = {};
  if (role) update.role = role;
  if (typeof isActive === 'boolean') update.isActive = isActive;
  const user = await User.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  res.json({ success: true, user });
});

module.exports = router;
