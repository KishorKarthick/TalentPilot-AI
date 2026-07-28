jest.mock('../../models/Candidate');
jest.mock('../../middleware/auth', () => require('../helpers/authMock').authMiddlewareMock());

const request = require('supertest');
const Candidate = require('../../models/Candidate');
const { createTestApp } = require('../helpers/testApp');
const { chainableQuery } = require('../helpers/queryMock');
const { setUser } = require('../helpers/authMock');

const app = createTestApp('/api/candidates', require('../../routes/candidates'));

beforeEach(() => setUser({ _id: 'rec1', role: 'recruiter' }));

describe('GET /api/candidates', () => {
  it('paginates with defaults', async () => {
    const query = chainableQuery([{ _id: 'c1' }]);
    Candidate.find.mockReturnValue(query);
    Candidate.countDocuments.mockResolvedValue(45);

    const res = await request(app).get('/api/candidates');

    expect(res.status).toBe(200);
    expect(Candidate.find).toHaveBeenCalledWith({});
    expect(query.skip).toHaveBeenCalledWith(0);
    expect(query.limit).toHaveBeenCalledWith(20);
    expect(res.body).toMatchObject({ total: 45, pages: 3 });
  });

  it('searches name, email and current title case-insensitively', async () => {
    Candidate.find.mockReturnValue(chainableQuery([]));
    Candidate.countDocuments.mockResolvedValue(0);

    await request(app).get('/api/candidates?search=grace');

    expect(Candidate.find).toHaveBeenCalledWith({
      $or: [
        { name: { $regex: 'grace', $options: 'i' } },
        { email: { $regex: 'grace', $options: 'i' } },
        { currentTitle: { $regex: 'grace', $options: 'i' } },
      ],
    });
  });

  it('filters by a comma separated skills list', async () => {
    Candidate.find.mockReturnValue(chainableQuery([]));
    Candidate.countDocuments.mockResolvedValue(0);

    await request(app).get('/api/candidates?skills=node,react');

    expect(Candidate.find).toHaveBeenCalledWith({ skills: { $in: ['node', 'react'] } });
  });
});

describe('GET /api/candidates/:id', () => {
  it('returns the candidate with resumes and applied jobs populated', async () => {
    const query = chainableQuery({ _id: 'c1' });
    Candidate.findById.mockReturnValue(query);

    const res = await request(app).get('/api/candidates/c1');

    expect(res.status).toBe(200);
    expect(query.populate).toHaveBeenCalledWith('resumes');
    expect(query.populate).toHaveBeenCalledWith('applications.job', 'title company');
  });

  it('returns 404 for an unknown candidate', async () => {
    Candidate.findById.mockReturnValue(chainableQuery(null));

    const res = await request(app).get('/api/candidates/missing');

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Candidate not found');
  });
});

describe('POST /api/candidates/:id/notes', () => {
  it('appends a note attributed to the authenticated user', async () => {
    Candidate.findByIdAndUpdate.mockResolvedValue({ _id: 'c1' });

    const res = await request(app).post('/api/candidates/c1/notes').send({ text: 'Great fit' });

    expect(res.status).toBe(200);
    expect(Candidate.findByIdAndUpdate).toHaveBeenCalledWith(
      'c1',
      { $push: { notes: { text: 'Great fit', addedBy: 'rec1' } } },
      { new: true },
    );
  });
});

describe('PATCH /api/candidates/:id/status', () => {
  it('updates the status of the matching application only', async () => {
    Candidate.findOneAndUpdate.mockResolvedValue({ _id: 'c1' });

    const res = await request(app)
      .patch('/api/candidates/c1/status')
      .send({ jobId: 'j1', status: 'interview' });

    expect(res.status).toBe(200);
    expect(Candidate.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'c1', 'applications.job': 'j1' },
      { $set: { 'applications.$.status': 'interview' } },
      { new: true },
    );
  });

  it('returns null data when the candidate has no application for the job', async () => {
    Candidate.findOneAndUpdate.mockResolvedValue(null);

    const res = await request(app)
      .patch('/api/candidates/c1/status')
      .send({ jobId: 'other', status: 'offer' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: null });
  });
});
