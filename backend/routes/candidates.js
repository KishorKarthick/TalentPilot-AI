const express = require('express');
const { body, validationResult } = require('express-validator');
const Candidate = require('../models/Candidate');
const { protect } = require('../middleware/auth');
const { escapeRegex, isValidObjectId, parsePagination } = require('../utils/security');

const router = express.Router();
router.use(protect);

const APPLICATION_STATUSES = ['applied', 'screening', 'interview', 'offer', 'hired', 'rejected'];

router.get('/', async (req, res) => {
  const { search, skills } = req.query;
  const { page, limit, skip } = parsePagination(req.query);
  const query = {};
  if (search) {
    const term = escapeRegex(String(search).slice(0, 100));
    query.$or = [
      { name: { $regex: term, $options: 'i' } },
      { email: { $regex: term, $options: 'i' } },
      { currentTitle: { $regex: term, $options: 'i' } },
    ];
  }
  if (skills) query.skills = { $in: String(skills).split(',').slice(0, 50) };

  const [candidates, total] = await Promise.all([
    Candidate.find(query).sort('-createdAt').skip(skip).limit(limit),
    Candidate.countDocuments(query),
  ]);

  res.json({ success: true, data: candidates, total, page, pages: Math.ceil(total / limit) });
});

router.get('/:id', async (req, res) => {
  if (!isValidObjectId(req.params.id))
    return res.status(400).json({ success: false, message: 'Invalid candidate id' });

  const candidate = await Candidate.findById(req.params.id)
    .populate('resumes').populate('applications.job', 'title company');
  if (!candidate) return res.status(404).json({ success: false, message: 'Candidate not found' });
  res.json({ success: true, data: candidate });
});

router.post('/:id/notes', [
  body('text').isString().trim().isLength({ min: 1, max: 5000 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  if (!isValidObjectId(req.params.id))
    return res.status(400).json({ success: false, message: 'Invalid candidate id' });

  const candidate = await Candidate.findByIdAndUpdate(
    req.params.id,
    { $push: { notes: { text: req.body.text, addedBy: req.user._id } } },
    { new: true }
  );
  if (!candidate) return res.status(404).json({ success: false, message: 'Candidate not found' });
  res.json({ success: true, data: candidate });
});

router.patch('/:id/status', [
  body('jobId').isMongoId(),
  body('status').isIn(APPLICATION_STATUSES),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  if (!isValidObjectId(req.params.id))
    return res.status(400).json({ success: false, message: 'Invalid candidate id' });

  const { jobId, status } = req.body;
  const candidate = await Candidate.findOneAndUpdate(
    { _id: req.params.id, 'applications.job': jobId },
    { $set: { 'applications.$.status': status } },
    { new: true }
  );
  if (!candidate) return res.status(404).json({ success: false, message: 'Application not found' });
  res.json({ success: true, data: candidate });
});

module.exports = router;
