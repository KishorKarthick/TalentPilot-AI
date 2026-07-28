jest.mock('fs');
jest.mock('axios');
jest.mock('pdf-parse');
jest.mock('mammoth');
jest.mock('../../models/Resume');
jest.mock('../../models/Candidate');
jest.mock('../../models/Job');
jest.mock('../../middleware/auth', () => require('../helpers/authMock').authMiddlewareMock());
jest.mock('../../middleware/upload', () => require('../helpers/uploadMock').uploadMock());

const request = require('supertest');
const fs = require('fs');
const crypto = require('crypto');
const axios = require('axios');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const Resume = require('../../models/Resume');
const Candidate = require('../../models/Candidate');
const Job = require('../../models/Job');
const { createTestApp } = require('../helpers/testApp');
const { chainableQuery } = require('../helpers/queryMock');
const { setUser } = require('../helpers/authMock');
const { setFiles } = require('../helpers/uploadMock');

const app = createTestApp('/api/resumes', require('../../routes/resumes'));

const FILE_CONTENT = Buffer.from('resume bytes');
const FILE_HASH = crypto.createHash('sha256').update(FILE_CONTENT).digest('hex');

const pdfFile = (overrides = {}) => ({
  originalname: 'grace.pdf',
  path: '/uploads/resumes/1-1.pdf',
  size: 1024,
  ...overrides,
});

const aiPayload = (overrides = {}) => ({
  name: 'Grace Hopper',
  email: 'Grace@Example.com',
  phone: '+1555',
  location: 'NYC',
  skills: ['cobol'],
  experience: [{ title: 'Rear Admiral' }],
  totalExperienceYears: 43,
  atsScore: 88,
  matchScore: 77,
  scoreBreakdown: { skillsMatch: 90 },
  matchedSkills: ['cobol'],
  missingSkills: ['node'],
  aiSummary: 'Excellent match',
  ...overrides,
});

beforeEach(() => {
  setUser({ _id: 'rec1', role: 'recruiter' });
  process.env.AI_SERVICE_URL = 'http://ai-service:8000';
  fs.readFileSync.mockReturnValue(FILE_CONTENT);
  fs.unlinkSync.mockImplementation(() => {});
  pdfParse.mockResolvedValue({ text: 'parsed pdf text' });
  mammoth.extractRawText.mockResolvedValue({ value: 'parsed docx text' });
  Resume.findOne.mockResolvedValue(null);
  Resume.create.mockImplementation((doc) => Promise.resolve({ _id: 'r1', ...doc }));
  Candidate.findOneAndUpdate.mockResolvedValue({ _id: 'c1' });
  Candidate.findByIdAndUpdate.mockResolvedValue({ _id: 'c1' });
  Job.findById.mockResolvedValue(null);
  Job.findByIdAndUpdate.mockResolvedValue({ _id: 'j1' });
  axios.post.mockResolvedValue({ data: aiPayload() });
});

describe('POST /api/resumes/upload', () => {
  it('rejects a request with no files', async () => {
    setFiles([]);

    const res = await request(app).post('/api/resumes/upload').send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('No files uploaded');
    expect(Resume.create).not.toHaveBeenCalled();
  });

  it('parses a PDF, scores it via the AI service and stores the resume', async () => {
    setFiles([pdfFile()]);

    const res = await request(app).post('/api/resumes/upload').send({});

    expect(res.status).toBe(200);
    expect(pdfParse).toHaveBeenCalledWith(FILE_CONTENT);
    expect(axios.post).toHaveBeenCalledWith(
      'http://ai-service:8000/extract',
      { resume_text: 'parsed pdf text', job_description: '' },
      { timeout: 30000 },
    );
    expect(Resume.create).toHaveBeenCalledWith(expect.objectContaining({
      uploadedBy: 'rec1',
      originalName: 'grace.pdf',
      fileUrl: '/uploads/resumes/1-1.pdf',
      fileType: 'pdf',
      fileSize: 1024,
      contentHash: FILE_HASH,
      rawText: 'parsed pdf text',
      atsScore: 88,
      matchScore: 77,
      status: 'reviewed',
    }));
    expect(res.body.results).toEqual({
      success: [{ file: 'grace.pdf', resumeId: 'r1', matchScore: 77 }],
      duplicates: [],
      failed: [],
    });
  });

  it('extracts DOCX files with mammoth', async () => {
    setFiles([pdfFile({ originalname: 'grace.DOCX', path: '/uploads/resumes/2-2.docx' })]);

    await request(app).post('/api/resumes/upload').send({});

    expect(mammoth.extractRawText).toHaveBeenCalledWith({ buffer: FILE_CONTENT });
    expect(pdfParse).not.toHaveBeenCalled();
    expect(Resume.create).toHaveBeenCalledWith(expect.objectContaining({ fileType: 'docx' }));
  });

  it('detects a duplicate by content hash, skips it and deletes the file', async () => {
    setFiles([pdfFile()]);
    Resume.findOne.mockResolvedValue({ _id: 'existing' });

    const res = await request(app).post('/api/resumes/upload').send({});

    expect(Resume.findOne).toHaveBeenCalledWith({ contentHash: FILE_HASH });
    expect(fs.unlinkSync).toHaveBeenCalledWith('/uploads/resumes/1-1.pdf');
    expect(Resume.create).not.toHaveBeenCalled();
    expect(res.body.results.duplicates).toEqual([
      { file: 'grace.pdf', duplicateOf: 'existing' },
    ]);
  });

  it('upserts the candidate from the extracted email in lowercase', async () => {
    setFiles([pdfFile()]);

    await request(app).post('/api/resumes/upload').send({});

    expect(Candidate.findOneAndUpdate).toHaveBeenCalledWith(
      { email: 'grace@example.com' },
      {
        $setOnInsert: { email: 'grace@example.com' },
        $set: expect.objectContaining({
          name: 'Grace Hopper',
          skills: ['cobol'],
          totalExperienceYears: 43,
          currentTitle: 'Rear Admiral',
        }),
      },
      { upsert: true, new: true },
    );
    expect(Candidate.findByIdAndUpdate).toHaveBeenCalledWith('c1', { $addToSet: { resumes: 'r1' } });
  });

  it('falls back to placeholder candidate fields when extraction is sparse', async () => {
    setFiles([pdfFile()]);
    axios.post.mockResolvedValue({ data: { email: 'grace@example.com' } });

    await request(app).post('/api/resumes/upload').send({});

    expect(Candidate.findOneAndUpdate).toHaveBeenCalledWith(
      { email: 'grace@example.com' },
      expect.objectContaining({
        $set: {
          name: 'Unknown',
          phone: undefined,
          location: undefined,
          skills: [],
          totalExperienceYears: 0,
          currentTitle: undefined,
        },
      }),
      { upsert: true, new: true },
    );
  });

  it('uses the AI summary field when no aiSummary is returned', async () => {
    setFiles([pdfFile()]);
    axios.post.mockResolvedValue({ data: aiPayload({ aiSummary: undefined, summary: 'Fallback summary' }) });

    await request(app).post('/api/resumes/upload').send({});

    expect(Resume.create).toHaveBeenCalledWith(expect.objectContaining({ aiSummary: 'Fallback summary' }));
  });

  it('links the resume to a job and increments the applicant count', async () => {
    setFiles([pdfFile()]);
    Job.findById.mockResolvedValue({ _id: 'j1', description: 'Build compilers' });

    await request(app).post('/api/resumes/upload').send({ jobId: 'j1' });

    expect(axios.post).toHaveBeenCalledWith(
      'http://ai-service:8000/extract',
      { resume_text: 'parsed pdf text', job_description: 'Build compilers' },
      { timeout: 30000 },
    );
    expect(Candidate.findByIdAndUpdate).toHaveBeenCalledWith('c1', {
      $push: { applications: { job: 'j1', resume: 'r1' } },
    });
    expect(Job.findByIdAndUpdate).toHaveBeenCalledWith('j1', { $inc: { applicantCount: 1 } });
  });

  it('still stores the resume with zeroed scores when the AI service is unavailable', async () => {
    setFiles([pdfFile()]);
    axios.post.mockRejectedValue(new Error('ECONNREFUSED'));

    const res = await request(app).post('/api/resumes/upload').send({});

    expect(Candidate.findOneAndUpdate).not.toHaveBeenCalled();
    expect(Resume.create).toHaveBeenCalledWith(expect.objectContaining({
      candidate: undefined,
      extractedData: {},
      atsScore: 0,
      matchScore: 0,
      matchedSkills: [],
      missingSkills: [],
      aiSummary: '',
    }));
    expect(res.body.results.success).toHaveLength(1);
  });

  it('reports per-file failures without aborting the batch', async () => {
    setFiles([pdfFile(), pdfFile({ originalname: 'broken.pdf', path: '/uploads/resumes/3-3.pdf' })]);
    pdfParse
      .mockResolvedValueOnce({ text: 'parsed pdf text' })
      .mockRejectedValueOnce(new Error('Invalid PDF structure'));

    const res = await request(app).post('/api/resumes/upload').send({});

    expect(res.body.results.success).toHaveLength(1);
    expect(res.body.results.failed).toEqual([
      { file: 'broken.pdf', error: 'Invalid PDF structure' },
    ]);
  });
});

describe('GET /api/resumes/job/:jobId', () => {
  it('ranks non-duplicate resumes by match score with default pagination', async () => {
    const query = chainableQuery([{ _id: 'r1' }]);
    Resume.find.mockReturnValue(query);
    Resume.countDocuments.mockResolvedValue(41);

    const res = await request(app).get('/api/resumes/job/j1');

    expect(res.status).toBe(200);
    expect(Resume.find).toHaveBeenCalledWith({ job: 'j1', isDuplicate: false });
    expect(query.sort).toHaveBeenCalledWith('-matchScore');
    expect(query.skip).toHaveBeenCalledWith(0);
    expect(query.limit).toHaveBeenCalledWith(20);
    expect(res.body).toMatchObject({ total: 41, pages: 3 });
  });

  it('filters by status and minimum score', async () => {
    Resume.find.mockReturnValue(chainableQuery([]));
    Resume.countDocuments.mockResolvedValue(0);

    await request(app).get('/api/resumes/job/j1?status=shortlisted&minScore=70');

    expect(Resume.find).toHaveBeenCalledWith({
      job: 'j1',
      isDuplicate: false,
      status: 'shortlisted',
      matchScore: { $gte: 70 },
    });
  });
});

describe('GET /api/resumes/:id', () => {
  it('returns the resume with candidate and job populated', async () => {
    const query = chainableQuery({ _id: 'r1' });
    Resume.findById.mockReturnValue(query);

    const res = await request(app).get('/api/resumes/r1');

    expect(res.status).toBe(200);
    expect(query.populate).toHaveBeenCalledWith('candidate');
    expect(query.populate).toHaveBeenCalledWith('job', 'title company');
  });

  it('returns 404 for an unknown resume', async () => {
    Resume.findById.mockReturnValue(chainableQuery(null));

    const res = await request(app).get('/api/resumes/missing');

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Resume not found');
  });
});

describe('PATCH /api/resumes/:id/status', () => {
  it('updates the resume status', async () => {
    Resume.findByIdAndUpdate.mockResolvedValue({ _id: 'r1', status: 'shortlisted' });

    const res = await request(app).patch('/api/resumes/r1/status').send({ status: 'shortlisted' });

    expect(res.status).toBe(200);
    expect(Resume.findByIdAndUpdate).toHaveBeenCalledWith(
      'r1',
      { status: 'shortlisted' },
      { new: true },
    );
  });
});

describe('POST /api/resumes/:id/rescore', () => {
  it('rescores against the requested job and stores the new scores', async () => {
    Resume.findById.mockResolvedValue({ _id: 'r1', rawText: 'parsed pdf text', job: 'j0' });
    Job.findById.mockResolvedValue({ _id: 'j1', description: 'Build compilers' });
    Resume.findByIdAndUpdate.mockResolvedValue({ _id: 'r1', matchScore: 77 });

    const res = await request(app).post('/api/resumes/r1/rescore').send({ jobId: 'j1' });

    expect(res.status).toBe(200);
    expect(Job.findById).toHaveBeenCalledWith('j1');
    expect(Resume.findByIdAndUpdate).toHaveBeenCalledWith(
      'r1',
      expect.objectContaining({ matchScore: 77, atsScore: 88, aiSummary: 'Excellent match' }),
      { new: true },
    );
  });

  it('falls back to the AI summary field when rescoring', async () => {
    Resume.findById.mockResolvedValue({ _id: 'r1', rawText: 'text', job: 'j1' });
    Job.findById.mockResolvedValue({ _id: 'j1', description: 'desc' });
    Resume.findByIdAndUpdate.mockResolvedValue({ _id: 'r1' });
    axios.post.mockResolvedValue({ data: aiPayload({ aiSummary: undefined, summary: 'Fallback summary' }) });

    await request(app).post('/api/resumes/r1/rescore').send({});

    expect(Resume.findByIdAndUpdate).toHaveBeenCalledWith(
      'r1',
      expect.objectContaining({ aiSummary: 'Fallback summary' }),
      { new: true },
    );
  });

  it('falls back to the job already linked to the resume', async () => {
    Resume.findById.mockResolvedValue({ _id: 'r1', rawText: 'text', job: 'j0' });
    Job.findById.mockResolvedValue({ _id: 'j0', description: 'desc' });
    Resume.findByIdAndUpdate.mockResolvedValue({ _id: 'r1' });

    await request(app).post('/api/resumes/r1/rescore').send({});

    expect(Job.findById).toHaveBeenCalledWith('j0');
  });

  it('returns 404 when the resume does not exist', async () => {
    Resume.findById.mockResolvedValue(null);

    const res = await request(app).post('/api/resumes/missing/rescore').send({ jobId: 'j1' });

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Resume not found');
  });

  it('returns 404 when the job does not exist', async () => {
    Resume.findById.mockResolvedValue({ _id: 'r1', rawText: 'text' });
    Job.findById.mockResolvedValue(null);

    const res = await request(app).post('/api/resumes/r1/rescore').send({ jobId: 'missing' });

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Job not found');
  });

  it('returns 500 when the AI service cannot rescore', async () => {
    Resume.findById.mockResolvedValue({ _id: 'r1', rawText: 'text', job: 'j1' });
    Job.findById.mockResolvedValue({ _id: 'j1', description: 'desc' });
    axios.post.mockRejectedValue(new Error('timeout'));

    const res = await request(app).post('/api/resumes/r1/rescore').send({});

    expect(res.status).toBe(500);
    expect(res.body.message).toBe('AI service unavailable');
    expect(Resume.findByIdAndUpdate).not.toHaveBeenCalled();
  });
});
