const express = require('express');
const nodemailer = require('nodemailer');
const { body, validationResult } = require('express-validator');
const Interview = require('../models/Interview');
const Candidate = require('../models/Candidate');
const { protect } = require('../middleware/auth');
const { escapeHtml, isValidObjectId, pick } = require('../utils/security');

const router = express.Router();
router.use(protect);

const INTERVIEW_FIELDS = [
  'candidate', 'job', 'resume', 'interviewers', 'type', 'round',
  'scheduledAt', 'duration', 'meetingLink', 'location', 'status', 'notes',
];
const FEEDBACK_FIELDS = [
  'rating', 'technicalScore', 'communicationScore', 'cultureFitScore', 'notes', 'recommendation',
];
const INTERVIEW_STATUSES = ['scheduled', 'completed', 'cancelled', 'rescheduled', 'no_show'];
const INTERVIEW_TYPES = ['phone', 'video', 'onsite', 'technical', 'hr'];

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: Number(process.env.EMAIL_PORT) === 465,
  requireTLS: true,
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

const isHttpUrl = (value) => typeof value === 'string' && /^https?:\/\//i.test(value);

const sendInterviewEmail = async (candidate, interview, job) => {
  try {
    await transporter.sendMail({
      from: `"Smart ATS" <${process.env.EMAIL_USER}>`,
      to: candidate.email,
      subject: `Interview Scheduled - ${String(job?.title || 'Position').replace(/[\r\n]+/g, ' ')}`,
      html: `
        <h2>Interview Confirmation</h2>
        <p>Dear ${escapeHtml(candidate.name)},</p>
        <p>Your <strong>${escapeHtml(interview.type)}</strong> interview has been scheduled.</p>
        <ul>
          <li><strong>Date & Time:</strong> ${escapeHtml(new Date(interview.scheduledAt).toLocaleString())}</li>
          <li><strong>Duration:</strong> ${Number(interview.duration)} minutes</li>
          ${isHttpUrl(interview.meetingLink) ? `<li><strong>Meeting Link:</strong> <a href="${escapeHtml(interview.meetingLink)}">${escapeHtml(interview.meetingLink)}</a></li>` : ''}
          ${interview.location ? `<li><strong>Location:</strong> ${escapeHtml(interview.location)}</li>` : ''}
        </ul>
        <p>Best regards,<br/>Recruitment Team</p>
      `,
    });
  } catch (err) {
    console.error('Email send failed:', err.message);
  }
};

router.post('/', [
  body('candidate').isMongoId(),
  body('job').isMongoId(),
  body('resume').optional().isMongoId(),
  body('type').isIn(INTERVIEW_TYPES),
  body('scheduledAt').isISO8601(),
  body('duration').optional().isInt({ min: 5, max: 8 * 60 }),
  body('status').optional().isIn(INTERVIEW_STATUSES),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const interview = await Interview.create({ ...pick(req.body, INTERVIEW_FIELDS), scheduledBy: req.user._id });
  const populated = await interview.populate([
    { path: 'candidate', select: 'name email' },
    { path: 'job', select: 'title company' },
  ]);

  await sendInterviewEmail(populated.candidate, interview, populated.job);
  res.status(201).json({ success: true, data: populated });
});

router.get('/', async (req, res) => {
  const { status, candidateId, jobId, from, to } = req.query;
  const query = {};
  if (status && INTERVIEW_STATUSES.includes(status)) query.status = status;
  if (candidateId && isValidObjectId(candidateId)) query.candidate = candidateId;
  if (jobId && isValidObjectId(jobId)) query.job = jobId;
  if (from || to) {
    query.scheduledAt = {};
    if (from) query.scheduledAt.$gte = new Date(from);
    if (to) query.scheduledAt.$lte = new Date(to);
  }

  const interviews = await Interview.find(query)
    .populate('candidate', 'name email')
    .populate('job', 'title company')
    .populate('scheduledBy', 'name')
    .sort('scheduledAt');

  res.json({ success: true, data: interviews });
});

router.get('/:id', async (req, res) => {
  if (!isValidObjectId(req.params.id))
    return res.status(400).json({ success: false, message: 'Invalid interview id' });

  const interview = await Interview.findById(req.params.id)
    .populate('candidate').populate('job').populate('interviewers', 'name email');
  if (!interview) return res.status(404).json({ success: false, message: 'Interview not found' });
  res.json({ success: true, data: interview });
});

router.put('/:id', [
  body('type').optional().isIn(INTERVIEW_TYPES),
  body('status').optional().isIn(INTERVIEW_STATUSES),
  body('scheduledAt').optional().isISO8601(),
  body('duration').optional().isInt({ min: 5, max: 8 * 60 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  if (!isValidObjectId(req.params.id))
    return res.status(400).json({ success: false, message: 'Invalid interview id' });

  const interview = await Interview.findByIdAndUpdate(
    req.params.id,
    pick(req.body, INTERVIEW_FIELDS),
    { new: true, runValidators: true }
  );
  if (!interview) return res.status(404).json({ success: false, message: 'Interview not found' });
  res.json({ success: true, data: interview });
});

router.post('/:id/feedback', [
  body('rating').optional().isInt({ min: 1, max: 5 }),
  body('technicalScore').optional().isInt({ min: 0, max: 100 }),
  body('communicationScore').optional().isInt({ min: 0, max: 100 }),
  body('cultureFitScore').optional().isInt({ min: 0, max: 100 }),
  body('notes').optional().isString().isLength({ max: 5000 }),
  body('recommendation').optional().isIn(['strong_yes', 'yes', 'maybe', 'no', 'strong_no']),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  if (!isValidObjectId(req.params.id))
    return res.status(400).json({ success: false, message: 'Invalid interview id' });

  const interview = await Interview.findByIdAndUpdate(
    req.params.id,
    {
      feedback: { ...pick(req.body, FEEDBACK_FIELDS), submittedBy: req.user._id, submittedAt: new Date() },
      status: 'completed',
    },
    { new: true }
  );
  res.json({ success: true, data: interview });
});

module.exports = router;
