const express = require('express');
const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const { handleValidation } = require('../middleware/validate');
const { sendSuccess, sendError, notFound } = require('../utils/apiResponse');

const router = express.Router();

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });

router.post('/register', [
  body('name').notEmpty().trim(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
], handleValidation, async (req, res) => {
  const { name, email, password, role, company } = req.body;
  const exists = await User.findOne({ email });
  if (exists) return sendError(res, 'Email already registered', 400);

  // Block public admin registration — admin role can only be assigned by existing admin
  if (role === 'admin') {
    return sendError(res, 'Admin accounts can only be created by an existing admin.', 403);
  }

  const user = await User.create({ name, email, password, role: role || 'recruiter', company });
  sendSuccess(res, { token: generateToken(user._id), user }, 201);
});

router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], handleValidation, async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.matchPassword(password)))
    return sendError(res, 'Invalid credentials', 401);

  user.lastLogin = new Date();
  await user.save();

  sendSuccess(res, { token: generateToken(user._id), user });
});

router.get('/me', protect, (req, res) => sendSuccess(res, { user: req.user }));

router.put('/profile', protect, async (req, res) => {
  const { name, company, avatar } = req.body;
  const user = await User.findByIdAndUpdate(req.user._id, { name, company, avatar }, { new: true });
  sendSuccess(res, { user });
});

// Admin only — create any role including admin
router.post('/users/create', protect, authorize('admin'), async (req, res) => {
  const { name, email, password, role, company } = req.body;
  const exists = await User.findOne({ email });
  if (exists) return sendError(res, 'Email already registered', 400);
  const user = await User.create({ name, email, password: password || 'TalentPilot@123', role, company });
  sendSuccess(res, { user }, 201);
});

// Admin only — get all users
router.get('/users', protect, authorize('admin'), async (req, res) => {
  const users = await User.find().sort('-createdAt');
  sendSuccess(res, { data: users });
});

// Admin only — update user role or status
router.patch('/users/:id', protect, authorize('admin'), async (req, res) => {
  const { role, isActive } = req.body;
  const update = {};
  if (role) update.role = role;
  if (typeof isActive === 'boolean') update.isActive = isActive;
  const user = await User.findByIdAndUpdate(req.params.id, update, { new: true });
  if (!user) return notFound(res, 'User');
  sendSuccess(res, { user });
});

module.exports = router;
