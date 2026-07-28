const express = require('express');
const Resume = require('../models/Resume');
const Job = require('../models/Job');
const Candidate = require('../models/Candidate');
const Interview = require('../models/Interview');
const { protect } = require('../middleware/auth');
const { sendSuccess } = require('../utils/apiResponse');

const router = express.Router();
router.use(protect);

router.get('/dashboard', async (req, res) => {
  const [
    totalJobs, activeJobs,
    totalResumes, pendingResumes,
    totalCandidates,
    totalInterviews, upcomingInterviews,
    duplicateResumes,
    recentActivity,
    scoreDistribution,
    topSkills,
    hiringFunnel,
  ] = await Promise.all([
    Job.countDocuments(),
    Job.countDocuments({ status: 'active' }),
    Resume.countDocuments({ isDuplicate: false }),
    Resume.countDocuments({ status: 'pending' }),
    Candidate.countDocuments(),
    Interview.countDocuments(),
    Interview.countDocuments({ status: 'scheduled', scheduledAt: { $gte: new Date() } }),
    Resume.countDocuments({ isDuplicate: true }),
    Resume.find().sort('-createdAt').limit(5).populate('candidate', 'name').populate('job', 'title').select('originalName status matchScore createdAt'),
    Resume.aggregate([
      { $match: { isDuplicate: false } },
      { $bucket: { groupBy: '$matchScore', boundaries: [0, 20, 40, 60, 80, 100], default: 'Other', output: { count: { $sum: 1 } } } },
    ]),
    Resume.aggregate([
      { $unwind: '$extractedData.skills' },
      { $group: { _id: '$extractedData.skills', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
    Candidate.aggregate([
      { $unwind: '$applications' },
      { $group: { _id: '$applications.status', count: { $sum: 1 } } },
    ]),
  ]);

  sendSuccess(res, {
    data: {
      overview: { totalJobs, activeJobs, totalResumes, pendingResumes, totalCandidates, totalInterviews, upcomingInterviews, duplicateResumes },
      recentActivity,
      scoreDistribution,
      topSkills,
      hiringFunnel,
    },
  });
});

router.get('/jobs/:jobId', async (req, res) => {
  const jobId = req.params.jobId;
  const [total, byStatus, avgScore, topCandidates] = await Promise.all([
    Resume.countDocuments({ job: jobId, isDuplicate: false }),
    Resume.aggregate([
      { $match: { job: require('mongoose').Types.ObjectId.createFromHexString(jobId) } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Resume.aggregate([
      { $match: { job: require('mongoose').Types.ObjectId.createFromHexString(jobId) } },
      { $group: { _id: null, avg: { $avg: '$matchScore' }, max: { $max: '$matchScore' } } },
    ]),
    Resume.find({ job: jobId }).sort('-matchScore').limit(5).populate('candidate', 'name email'),
  ]);

  sendSuccess(res, { data: { total, byStatus, avgScore: avgScore[0], topCandidates } });
});

module.exports = router;
