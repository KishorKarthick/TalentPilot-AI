const express = require('express');
const { body, validationResult } = require('express-validator');
const Job = require('../models/Job');
const { protect } = require('../middleware/auth');
const { isValidObjectId, pick, parsePagination } = require('../utils/security');

const router = express.Router();
router.use(protect);

const JOB_FIELDS = [
  'title', 'company', 'department', 'location', 'type', 'description',
  'requirements', 'skills', 'experience', 'salary', 'status', 'deadline',
];

const JOB_STATUSES = ['active', 'paused', 'closed', 'draft'];

const findJobOr404 = async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    res.status(400).json({ success: false, message: 'Invalid job id' });
    return null;
  }
  const job = await Job.findById(req.params.id);
  if (!job) {
    res.status(404).json({ success: false, message: 'Job not found' });
    return null;
  }
  return job;
};

const canModify = (job, user) => user.role === 'admin' || String(job.postedBy) === String(user._id);

router.get('/', async (req, res) => {
  const { status, search } = req.query;
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 10 });
  const query = {};
  if (status && JOB_STATUSES.includes(status)) query.status = status;
  if (search) query.$text = { $search: String(search) };

  const [jobs, total] = await Promise.all([
    Job.find(query).populate('postedBy', 'name email').sort('-createdAt').skip(skip).limit(limit),
    Job.countDocuments(query),
  ]);

  res.json({ success: true, data: jobs, total, page, pages: Math.ceil(total / limit) });
});

router.post('/', [
  body('title').isString().notEmpty(),
  body('company').isString().notEmpty(),
  body('description').isString().notEmpty(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const job = await Job.create({ ...pick(req.body, JOB_FIELDS), postedBy: req.user._id });
  res.status(201).json({ success: true, data: job });
});

router.get('/:id', async (req, res) => {
  if (!isValidObjectId(req.params.id))
    return res.status(400).json({ success: false, message: 'Invalid job id' });

  const job = await Job.findById(req.params.id).populate('postedBy', 'name email');
  if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
  res.json({ success: true, data: job });
});

router.put('/:id', async (req, res) => {
  const job = await findJobOr404(req, res);
  if (!job) return;
  if (!canModify(job, req.user))
    return res.status(403).json({ success: false, message: 'Access denied' });

  Object.assign(job, pick(req.body, JOB_FIELDS));
  await job.save();
  res.json({ success: true, data: job });
});

router.delete('/:id', async (req, res) => {
  const job = await findJobOr404(req, res);
  if (!job) return;
  if (!canModify(job, req.user))
    return res.status(403).json({ success: false, message: 'Access denied' });

  await job.deleteOne();
  res.json({ success: true, message: 'Job deleted' });
});

module.exports = router;
