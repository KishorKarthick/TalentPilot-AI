const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const axios = require('axios');
const Resume = require('../models/Resume');
const Candidate = require('../models/Candidate');
const Job = require('../models/Job');
const { protect } = require('../middleware/auth');
const { uploadResumes } = require('../middleware/upload');
const { isValidObjectId, parsePagination } = require('../utils/security');

const router = express.Router();
router.use(protect);

const RESUME_STATUSES = ['pending', 'processing', 'reviewed', 'shortlisted', 'rejected', 'hired'];

// Extract text from file
const extractText = async (filePath, fileType) => {
  const buffer = fs.readFileSync(filePath);
  if (fileType === 'pdf') {
    const data = await pdfParse(buffer);
    return data.text;
  }
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
};

// Compute file hash for duplicate detection
const computeHash = (filePath) => {
  const buffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buffer).digest('hex');
};

// Call AI service to extract resume data
const processWithAI = async (text, jobDescription = '') => {
  try {
    const response = await axios.post(`${process.env.AI_SERVICE_URL}/extract`, {
      resume_text: text,
      job_description: jobDescription,
    }, {
      timeout: 30000,
      maxRedirects: 0,
      headers: { 'X-API-Key': process.env.AI_SERVICE_API_KEY },
    });
    return response.data;
  } catch (err) {
    console.error('AI service request failed:', err.message);
    return null;
  }
};

// Bulk upload resumes
router.post('/upload', uploadResumes, async (req, res) => {
  const { jobId } = req.body;
  if (!req.files?.length) return res.status(400).json({ success: false, message: 'No files uploaded' });
  if (jobId && !isValidObjectId(jobId))
    return res.status(400).json({ success: false, message: 'Invalid job id' });

  const job = jobId ? await Job.findById(jobId) : null;
  if (jobId && !job) return res.status(404).json({ success: false, message: 'Job not found' });
  const results = { success: [], duplicates: [], failed: [] };

  for (const file of req.files) {
    try {
      const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
      const hash = computeHash(file.path);

      // Duplicate detection
      const existing = await Resume.findOne({ contentHash: hash });
      if (existing) {
        results.duplicates.push({ file: file.originalname, duplicateOf: existing._id });
        fs.unlinkSync(file.path);
        continue;
      }

      const rawText = await extractText(file.path, ext);
      const aiData = await processWithAI(rawText, job?.description || '');

      // Upsert candidate
      let candidate = null;
      if (aiData?.email) {
        candidate = await Candidate.findOneAndUpdate(
          { email: aiData.email.toLowerCase() },
          {
            $setOnInsert: { email: aiData.email.toLowerCase() },
            $set: {
              name: aiData.name || 'Unknown',
              phone: aiData.phone,
              location: aiData.location,
              skills: aiData.skills || [],
              totalExperienceYears: aiData.totalExperienceYears || 0,
              currentTitle: aiData.experience?.[0]?.title,
            },
          },
          { upsert: true, new: true }
        );
      }

      const resume = await Resume.create({
        candidate: candidate?._id,
        job: jobId || undefined,
        uploadedBy: req.user._id,
        originalName: file.originalname,
        fileUrl: path.join('uploads/resumes', path.basename(file.path)),
        fileType: ext,
        fileSize: file.size,
        contentHash: hash,
        rawText,
        extractedData: aiData || {},
        atsScore: aiData?.atsScore || 0,
        matchScore: aiData?.matchScore || 0,
        scoreBreakdown: aiData?.scoreBreakdown || {},
        matchedSkills: aiData?.matchedSkills || [],
        missingSkills: aiData?.missingSkills || [],
        aiSummary: aiData?.aiSummary || aiData?.summary || '',
        status: 'reviewed',
      });

      if (candidate) {
        await Candidate.findByIdAndUpdate(candidate._id, {
          $addToSet: { resumes: resume._id },
        });
        if (jobId) {
          await Candidate.findByIdAndUpdate(candidate._id, {
            $push: { applications: { job: jobId, resume: resume._id } },
          });
          await Job.findByIdAndUpdate(jobId, { $inc: { applicantCount: 1 } });
        }
      }

      results.success.push({ file: file.originalname, resumeId: resume._id, matchScore: resume.matchScore });
    } catch (err) {
      console.error(`Resume processing failed for ${file.originalname}:`, err);
      results.failed.push({ file: file.originalname, error: 'Processing failed' });
    }
  }

  res.json({ success: true, results });
});

// Get resumes for a job, ranked by match score
router.get('/job/:jobId', async (req, res) => {
  if (!isValidObjectId(req.params.jobId))
    return res.status(400).json({ success: false, message: 'Invalid job id' });

  const { status, minScore } = req.query;
  const { page, limit, skip } = parsePagination(req.query);
  const query = { job: req.params.jobId, isDuplicate: false };
  if (status && RESUME_STATUSES.includes(status)) query.status = status;
  if (minScore !== undefined && Number.isFinite(Number(minScore)))
    query.matchScore = { $gte: Number(minScore) };

  const [resumes, total] = await Promise.all([
    Resume.find(query).populate('candidate', 'name email phone').sort('-matchScore')
      .skip(skip).limit(limit),
    Resume.countDocuments(query),
  ]);

  res.json({ success: true, data: resumes, total, page, pages: Math.ceil(total / limit) });
});

// Get single resume
router.get('/:id', async (req, res) => {
  if (!isValidObjectId(req.params.id))
    return res.status(400).json({ success: false, message: 'Invalid resume id' });

  const resume = await Resume.findById(req.params.id)
    .populate('candidate').populate('job', 'title company');
  if (!resume) return res.status(404).json({ success: false, message: 'Resume not found' });
  res.json({ success: true, data: resume });
});

// Update resume status
router.patch('/:id/status', async (req, res) => {
  const { status } = req.body;
  if (!isValidObjectId(req.params.id))
    return res.status(400).json({ success: false, message: 'Invalid resume id' });
  if (!RESUME_STATUSES.includes(status))
    return res.status(400).json({ success: false, message: 'Invalid status' });

  const resume = await Resume.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!resume) return res.status(404).json({ success: false, message: 'Resume not found' });
  res.json({ success: true, data: resume });
});

// Re-score resume against a job
router.post('/:id/rescore', async (req, res) => {
  if (!isValidObjectId(req.params.id))
    return res.status(400).json({ success: false, message: 'Invalid resume id' });
  if (req.body.jobId && !isValidObjectId(req.body.jobId))
    return res.status(400).json({ success: false, message: 'Invalid job id' });

  const resume = await Resume.findById(req.params.id);
  if (!resume) return res.status(404).json({ success: false, message: 'Resume not found' });

  const job = await Job.findById(req.body.jobId || resume.job);
  if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

  const aiData = await processWithAI(resume.rawText, job.description);
  if (!aiData) return res.status(500).json({ success: false, message: 'AI service unavailable' });

  const updated = await Resume.findByIdAndUpdate(req.params.id, {
    matchScore: aiData.matchScore,
    atsScore: aiData.atsScore,
    scoreBreakdown: aiData.scoreBreakdown,
    matchedSkills: aiData.matchedSkills,
    missingSkills: aiData.missingSkills,
    aiSummary: aiData.aiSummary || aiData.summary || '',
  }, { new: true });

  res.json({ success: true, data: updated });
});

module.exports = router;
