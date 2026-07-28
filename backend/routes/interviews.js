const express = require('express');
const nodemailer = require('nodemailer');
const Interview = require('../models/Interview');
const Candidate = require('../models/Candidate');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

// Returns null on success, or the failure reason so the caller can report it.
const sendInterviewEmail = async (candidate, interview, job) => {
  if (!candidate?.email) return 'Candidate has no email address on file';
  try {
    await transporter.sendMail({
      from: `"Smart ATS" <${process.env.EMAIL_USER}>`,
      to: candidate.email,
      subject: `Interview Scheduled - ${job?.title || 'Position'}`,
      html: `
        <h2>Interview Confirmation</h2>
        <p>Dear ${candidate.name},</p>
        <p>Your <strong>${interview.type}</strong> interview has been scheduled.</p>
        <ul>
          <li><strong>Date & Time:</strong> ${new Date(interview.scheduledAt).toLocaleString()}</li>
          <li><strong>Duration:</strong> ${interview.duration} minutes</li>
          ${interview.meetingLink ? `<li><strong>Meeting Link:</strong> <a href="${interview.meetingLink}">${interview.meetingLink}</a></li>` : ''}
          ${interview.location ? `<li><strong>Location:</strong> ${interview.location}</li>` : ''}
        </ul>
        <p>Best regards,<br/>Recruitment Team</p>
      `,
    });
    return null;
  } catch (err) {
    console.error('Email send failed:', err.message);
    return `Notification email could not be sent: ${err.message}`;
  }
};

router.post('/', async (req, res) => {
  const interview = await Interview.create({ ...req.body, scheduledBy: req.user._id });
  const populated = await interview.populate([
    { path: 'candidate', select: 'name email' },
    { path: 'job', select: 'title company' },
  ]);

  const emailError = await sendInterviewEmail(populated.candidate, interview, populated.job);
  res.status(201).json({ success: true, data: populated, emailSent: !emailError, ...(emailError ? { emailError } : {}) });
});

router.get('/', async (req, res) => {
  const { status, candidateId, jobId, from, to } = req.query;
  const query = {};
  if (status) query.status = status;
  if (candidateId) query.candidate = candidateId;
  if (jobId) query.job = jobId;
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
  const interview = await Interview.findById(req.params.id)
    .populate('candidate').populate('job').populate('interviewers', 'name email');
  if (!interview) return res.status(404).json({ success: false, message: 'Interview not found' });
  res.json({ success: true, data: interview });
});

router.put('/:id', async (req, res) => {
  const interview = await Interview.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!interview) return res.status(404).json({ success: false, message: 'Interview not found' });
  res.json({ success: true, data: interview });
});

router.post('/:id/feedback', async (req, res) => {
  const interview = await Interview.findByIdAndUpdate(
    req.params.id,
    { feedback: { ...req.body, submittedBy: req.user._id, submittedAt: new Date() }, status: 'completed' },
    { new: true, runValidators: true }
  );
  if (!interview) return res.status(404).json({ success: false, message: 'Interview not found' });
  res.json({ success: true, data: interview });
});

module.exports = router;
