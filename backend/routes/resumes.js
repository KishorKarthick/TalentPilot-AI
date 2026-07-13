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
const upload = require('../middleware/upload');

const router = express.Router();
router.use(protect);

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
    }, { timeout: 30000 });
    return response.data;
  } catch {
    return null;
  }
};

// Bulk upload resumes
router.post('/upload', upload.array('resumes', 100), async (req, res) => {
  const { jobId } = req.body;
  if (!req.files?.length) return res.status(400).json({ success: false, message: 'No files uploaded' });

  const job = jobId ? await Job.findById(jobId) : null;
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
        fileUrl: file.path,
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
      results.failed.push({ file: file.originalname, error: err.message });
    }
  }

  res.json({ success: true, results });
});

// Get resumes for a job, ranked by match score
router.get('/job/:jobId', async (req, res) => {
  const { page = 1, limit = 20, status, minScore } = req.query;
  const query = { job: req.params.jobId, isDuplicate: false };
  if (status) query.status = status;
  if (minScore) query.matchScore = { $gte: Number(minScore) };

  const [resumes, total] = await Promise.all([
    Resume.find(query).populate('candidate', 'name email phone').sort('-matchScore')
      .skip((page - 1) * limit).limit(Number(limit)),
    Resume.countDocuments(query),
  ]);

  res.json({ success: true, data: resumes, total, pages: Math.ceil(total / limit) });
});

// Get single resume
router.get('/:id', async (req, res) => {
  const resume = await Resume.findById(req.params.id)
    .populate('candidate').populate('job', 'title company');
  if (!resume) return res.status(404).json({ success: false, message: 'Resume not found' });
  res.json({ success: true, data: resume });
});

// Update resume status
router.patch('/:id/status', async (req, res) => {
  const { status } = req.body;
  const resume = await Resume.findByIdAndUpdate(req.params.id, { status }, { new: true });
  res.json({ success: true, data: resume });
});

// Re-score resume against a job
router.post('/:id/rescore', async (req, res) => {
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
