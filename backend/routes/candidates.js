const express = require('express');
const Candidate = require('../models/Candidate');
const { protect } = require('../middleware/auth');
const { sendSuccess, notFound } = require('../utils/apiResponse');
const { getPagination, paginationMeta } = require('../utils/pagination');

const router = express.Router();
router.use(protect);

router.get('/', async (req, res) => {
  const { search, skills } = req.query;
  const { limit, skip } = getPagination(req.query, 20);
  const query = {};
  if (search) query.$or = [
    { name: { $regex: search, $options: 'i' } },
    { email: { $regex: search, $options: 'i' } },
    { currentTitle: { $regex: search, $options: 'i' } },
  ];
  if (skills) query.skills = { $in: skills.split(',') };

  const [candidates, total] = await Promise.all([
    Candidate.find(query).sort('-createdAt').skip(skip).limit(limit),
    Candidate.countDocuments(query),
  ]);

  sendSuccess(res, { data: candidates, ...paginationMeta(total, limit) });
});

router.get('/:id', async (req, res) => {
  const candidate = await Candidate.findById(req.params.id)
    .populate('resumes').populate('applications.job', 'title company');
  if (!candidate) return notFound(res, 'Candidate');
  sendSuccess(res, { data: candidate });
});

router.post('/:id/notes', async (req, res) => {
  const candidate = await Candidate.findByIdAndUpdate(
    req.params.id,
    { $push: { notes: { text: req.body.text, addedBy: req.user._id } } },
    { new: true }
  );
  sendSuccess(res, { data: candidate });
});

router.patch('/:id/status', async (req, res) => {
  const { jobId, status } = req.body;
  const candidate = await Candidate.findOneAndUpdate(
    { _id: req.params.id, 'applications.job': jobId },
    { $set: { 'applications.$.status': status } },
    { new: true }
  );
  sendSuccess(res, { data: candidate });
});

module.exports = router;
