jest.mock('../../models/Resume');
jest.mock('../../models/Job');
jest.mock('../../models/Candidate');
jest.mock('../../models/Interview');
jest.mock('../../middleware/auth', () => require('../helpers/authMock').authMiddlewareMock());

const request = require('supertest');
const mongoose = require('mongoose');
const Resume = require('../../models/Resume');
const Job = require('../../models/Job');
const Candidate = require('../../models/Candidate');
const Interview = require('../../models/Interview');
const { createTestApp } = require('../helpers/testApp');
const { chainableQuery } = require('../helpers/queryMock');
const { setUser } = require('../helpers/authMock');

const app = createTestApp('/api/analytics', require('../../routes/analytics'));

beforeEach(() => setUser({ _id: 'rec1', role: 'recruiter' }));

describe('GET /api/analytics/dashboard', () => {
  const setupCounts = () => {
    Job.countDocuments.mockResolvedValueOnce(10).mockResolvedValueOnce(4);
    Resume.countDocuments
      .mockResolvedValueOnce(100) // total, non-duplicate
      .mockResolvedValueOnce(7) // pending
      .mockResolvedValueOnce(3); // duplicates
    Candidate.countDocuments.mockResolvedValue(80);
    Interview.countDocuments.mockResolvedValueOnce(12).mockResolvedValueOnce(5);
    Resume.find.mockReturnValue(chainableQuery([{ _id: 'r1' }]));
    Resume.aggregate
      .mockResolvedValueOnce([{ _id: 0, count: 2 }])
      .mockResolvedValueOnce([{ _id: 'node', count: 9 }]);
    Candidate.aggregate.mockResolvedValue([{ _id: 'applied', count: 40 }]);
  };

  it('aggregates the overview counters, charts and recent activity', async () => {
    setupCounts();

    const res = await request(app).get('/api/analytics/dashboard');

    expect(res.status).toBe(200);
    expect(res.body.data.overview).toEqual({
      totalJobs: 10,
      activeJobs: 4,
      totalResumes: 100,
      pendingResumes: 7,
      totalCandidates: 80,
      totalInterviews: 12,
      upcomingInterviews: 5,
      duplicateResumes: 3,
    });
    expect(res.body.data.recentActivity).toEqual([{ _id: 'r1' }]);
    expect(res.body.data.scoreDistribution).toEqual([{ _id: 0, count: 2 }]);
    expect(res.body.data.topSkills).toEqual([{ _id: 'node', count: 9 }]);
    expect(res.body.data.hiringFunnel).toEqual([{ _id: 'applied', count: 40 }]);
  });

  it('scopes the counters to the documented filters', async () => {
    setupCounts();

    await request(app).get('/api/analytics/dashboard');

    expect(Job.countDocuments).toHaveBeenCalledWith({ status: 'active' });
    expect(Resume.countDocuments).toHaveBeenCalledWith({ isDuplicate: false });
    expect(Resume.countDocuments).toHaveBeenCalledWith({ status: 'pending' });
    expect(Resume.countDocuments).toHaveBeenCalledWith({ isDuplicate: true });
    expect(Interview.countDocuments).toHaveBeenCalledWith({
      status: 'scheduled',
      scheduledAt: { $gte: expect.any(Date) },
    });
  });

  it('limits recent activity to the five newest resumes', async () => {
    setupCounts();
    const query = chainableQuery([]);
    Resume.find.mockReturnValue(query);

    await request(app).get('/api/analytics/dashboard');

    expect(query.sort).toHaveBeenCalledWith('-createdAt');
    expect(query.limit).toHaveBeenCalledWith(5);
    expect(query.select).toHaveBeenCalledWith('originalName status matchScore createdAt');
  });

  it('buckets match scores into 20-point bands', async () => {
    setupCounts();

    await request(app).get('/api/analytics/dashboard');

    const [pipeline] = Resume.aggregate.mock.calls[0];
    expect(pipeline[0]).toEqual({ $match: { isDuplicate: false } });
    expect(pipeline[1].$bucket.boundaries).toEqual([0, 20, 40, 60, 80, 100]);
  });

  it('returns the ten most common extracted skills', async () => {
    setupCounts();

    await request(app).get('/api/analytics/dashboard');

    const [pipeline] = Resume.aggregate.mock.calls[1];
    expect(pipeline[0]).toEqual({ $unwind: '$extractedData.skills' });
    expect(pipeline).toContainEqual({ $limit: 10 });
  });
});

describe('GET /api/analytics/jobs/:jobId', () => {
  const jobId = '507f1f77bcf86cd799439011';

  const setupJobStats = () => {
    Resume.countDocuments.mockResolvedValue(30);
    Resume.aggregate
      .mockResolvedValueOnce([{ _id: 'reviewed', count: 20 }])
      .mockResolvedValueOnce([{ _id: null, avg: 62.5, max: 91 }]);
    Resume.find.mockReturnValue(chainableQuery([{ _id: 'r1' }]));
  };

  it('returns per-job totals, status split, score stats and top candidates', async () => {
    setupJobStats();

    const res = await request(app).get(`/api/analytics/jobs/${jobId}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      total: 30,
      byStatus: [{ _id: 'reviewed', count: 20 }],
      avgScore: { _id: null, avg: 62.5, max: 91 },
      topCandidates: [{ _id: 'r1' }],
    });
    expect(Resume.countDocuments).toHaveBeenCalledWith({ job: jobId, isDuplicate: false });
  });

  it('matches aggregations on the job ObjectId', async () => {
    setupJobStats();

    await request(app).get(`/api/analytics/jobs/${jobId}`);

    const expected = mongoose.Types.ObjectId.createFromHexString(jobId);
    expect(Resume.aggregate.mock.calls[0][0][0]).toEqual({ $match: { job: expected } });
    expect(Resume.aggregate.mock.calls[1][0][0]).toEqual({ $match: { job: expected } });
  });

  it('ranks the top five candidates by match score', async () => {
    setupJobStats();
    const query = chainableQuery([]);
    Resume.find.mockReturnValue(query);

    await request(app).get(`/api/analytics/jobs/${jobId}`);

    expect(Resume.find).toHaveBeenCalledWith({ job: jobId });
    expect(query.sort).toHaveBeenCalledWith('-matchScore');
    expect(query.limit).toHaveBeenCalledWith(5);
    expect(query.populate).toHaveBeenCalledWith('candidate', 'name email');
  });

  it('returns 500 when the job id is not a valid ObjectId', async () => {
    setupJobStats();

    const res = await request(app).get('/api/analytics/jobs/not-an-object-id');

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });

  it('leaves avgScore undefined when the job has no resumes', async () => {
    Resume.countDocuments.mockResolvedValue(0);
    Resume.aggregate.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    Resume.find.mockReturnValue(chainableQuery([]));

    const res = await request(app).get(`/api/analytics/jobs/${jobId}`);

    expect(res.status).toBe(200);
    expect(res.body.data.avgScore).toBeUndefined();
  });
});
