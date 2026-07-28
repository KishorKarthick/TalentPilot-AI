const express = require('express');
const { body } = require('express-validator');
const Job = require('../models/Job');
const { protect } = require('../middleware/auth');
const { handleValidation } = require('../middleware/validate');
const { sendSuccess, notFound } = require('../utils/apiResponse');
const { getPagination, paginationMeta } = require('../utils/pagination');

const router = express.Router();
router.use(protect);

router.get('/', async (req, res) => {
  const { status, search } = req.query;
  const { limit, skip } = getPagination(req.query, 10);
  const query = {};
  if (status) query.status = status;
  if (search) query.$text = { $search: search };

  const [jobs, total] = await Promise.all([
    Job.find(query).populate('postedBy', 'name email').sort('-createdAt')
      .skip(skip).limit(limit),
    Job.countDocuments(query),
  ]);

  sendSuccess(res, { data: jobs, ...paginationMeta(total, limit) });
});

router.post('/', [
  body('title').notEmpty(),
  body('company').notEmpty(),
  body('description').notEmpty(),
], handleValidation, async (req, res) => {
  const job = await Job.create({ ...req.body, postedBy: req.user._id });
  sendSuccess(res, { data: job }, 201);
});

router.get('/:id', async (req, res) => {
  const job = await Job.findById(req.params.id).populate('postedBy', 'name email');
  if (!job) return notFound(res, 'Job');
  sendSuccess(res, { data: job });
});

router.put('/:id', async (req, res) => {
  const job = await Job.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!job) return notFound(res, 'Job');
  sendSuccess(res, { data: job });
});

router.delete('/:id', async (req, res) => {
  await Job.findByIdAndDelete(req.params.id);
  sendSuccess(res, { message: 'Job deleted' });
});

module.exports = router;
