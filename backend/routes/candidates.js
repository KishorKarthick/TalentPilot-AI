const express = require('express');
const Candidate = require('../models/Candidate');
const { protect } = require('../middleware/auth');
const ApiError = require('../utils/ApiError');

const router = express.Router();
router.use(protect);

router.get('/', async (req, res) => {
  const { search, skills, page = 1, limit = 20 } = req.query;
  const query = {};
  if (search) query.$or = [
    { name: { $regex: search, $options: 'i' } },
    { email: { $regex: search, $options: 'i' } },
    { currentTitle: { $regex: search, $options: 'i' } },
  ];
  if (skills) query.skills = { $in: skills.split(',') };

  const [candidates, total] = await Promise.all([
    Candidate.find(query).sort('-createdAt').skip((page - 1) * limit).limit(Number(limit)),
    Candidate.countDocuments(query),
  ]);

  res.json({ success: true, data: candidates, total, pages: Math.ceil(total / limit) });
});

router.get('/:id', async (req, res) => {
  const candidate = await Candidate.findById(req.params.id)
    .populate('resumes').populate('applications.job', 'title company');
  if (!candidate) return res.status(404).json({ success: false, message: 'Candidate not found' });
  res.json({ success: true, data: candidate });
});

router.post('/:id/notes', async (req, res) => {
  if (!req.body.text?.trim()) throw new ApiError(400, 'Note text is required');

  const candidate = await Candidate.findByIdAndUpdate(
    req.params.id,
    { $push: { notes: { text: req.body.text, addedBy: req.user._id } } },
    { new: true, runValidators: true }
  );
  if (!candidate) return res.status(404).json({ success: false, message: 'Candidate not found' });
  res.json({ success: true, data: candidate });
});

router.patch('/:id/status', async (req, res) => {
  const { jobId, status } = req.body;
  if (!jobId || !status) throw new ApiError(400, 'jobId and status are required');

  const candidate = await Candidate.findOneAndUpdate(
    { _id: req.params.id, 'applications.job': jobId },
    { $set: { 'applications.$.status': status } },
    { new: true, runValidators: true }
  );
  // A null result means the candidate does not exist or never applied to this job.
  if (!candidate) return res.status(404).json({ success: false, message: 'No application found for this candidate and job' });
  res.json({ success: true, data: candidate });
});

module.exports = router;
