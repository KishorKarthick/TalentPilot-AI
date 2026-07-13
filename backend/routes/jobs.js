const express = require('express');
const { body, validationResult } = require('express-validator');
const Job = require('../models/Job');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router.get('/', async (req, res) => {
  const { status, search, page = 1, limit = 10 } = req.query;
  const query = {};
  if (status) query.status = status;
  if (search) query.$text = { $search: search };

  const [jobs, total] = await Promise.all([
    Job.find(query).populate('postedBy', 'name email').sort('-createdAt')
      .skip((page - 1) * limit).limit(Number(limit)),
    Job.countDocuments(query),
  ]);

  res.json({ success: true, data: jobs, total, pages: Math.ceil(total / limit) });
});

router.post('/', [
  body('title').notEmpty(),
  body('company').notEmpty(),
  body('description').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const job = await Job.create({ ...req.body, postedBy: req.user._id });
  res.status(201).json({ success: true, data: job });
});

router.get('/:id', async (req, res) => {
  const job = await Job.findById(req.params.id).populate('postedBy', 'name email');
  if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
  res.json({ success: true, data: job });
});

router.put('/:id', async (req, res) => {
  const job = await Job.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
  res.json({ success: true, data: job });
});

router.delete('/:id', async (req, res) => {
  await Job.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'Job deleted' });
});

module.exports = router;
