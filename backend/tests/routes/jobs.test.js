jest.mock('../../models/Job');
jest.mock('../../middleware/auth', () => require('../helpers/authMock').authMiddlewareMock());

const request = require('supertest');
const Job = require('../../models/Job');
const { createTestApp } = require('../helpers/testApp');
const { chainableQuery } = require('../helpers/queryMock');
const { setUser } = require('../helpers/authMock');

const app = createTestApp('/api/jobs', require('../../routes/jobs'));

beforeEach(() => setUser({ _id: 'rec1', role: 'recruiter' }));

describe('GET /api/jobs', () => {
  it('paginates with defaults and reports the page count', async () => {
    const query = chainableQuery([{ _id: 'j1' }]);
    Job.find.mockReturnValue(query);
    Job.countDocuments.mockResolvedValue(25);

    const res = await request(app).get('/api/jobs');

    expect(res.status).toBe(200);
    expect(Job.find).toHaveBeenCalledWith({});
    expect(query.skip).toHaveBeenCalledWith(0);
    expect(query.limit).toHaveBeenCalledWith(10);
    expect(query.sort).toHaveBeenCalledWith('-createdAt');
    expect(res.body).toMatchObject({ total: 25, pages: 3, data: [{ _id: 'j1' }] });
  });

  it('applies the requested page and limit', async () => {
    const query = chainableQuery([]);
    Job.find.mockReturnValue(query);
    Job.countDocuments.mockResolvedValue(0);

    await request(app).get('/api/jobs?page=3&limit=5');

    expect(query.skip).toHaveBeenCalledWith(10);
    expect(query.limit).toHaveBeenCalledWith(5);
  });

  it('filters by status and full-text search', async () => {
    Job.find.mockReturnValue(chainableQuery([]));
    Job.countDocuments.mockResolvedValue(0);

    await request(app).get('/api/jobs?status=active&search=engineer');

    expect(Job.find).toHaveBeenCalledWith({ status: 'active', $text: { $search: 'engineer' } });
  });
});

describe('POST /api/jobs', () => {
  const payload = { title: 'Engineer', company: 'Acme', description: 'Build things' };

  it('creates a job owned by the authenticated user', async () => {
    Job.create.mockResolvedValue({ _id: 'j1', ...payload });

    const res = await request(app).post('/api/jobs').send(payload);

    expect(res.status).toBe(201);
    expect(Job.create).toHaveBeenCalledWith({ ...payload, postedBy: 'rec1' });
  });

  it.each(['title', 'company', 'description'])('rejects a missing %s', async (field) => {
    const res = await request(app).post('/api/jobs').send({ ...payload, [field]: '' });

    expect(res.status).toBe(400);
    expect(res.body.errors.some((e) => e.path === field)).toBe(true);
    expect(Job.create).not.toHaveBeenCalled();
  });
});

describe('GET /api/jobs/:id', () => {
  it('returns the job with its poster populated', async () => {
    const query = chainableQuery({ _id: 'j1' });
    Job.findById.mockReturnValue(query);

    const res = await request(app).get('/api/jobs/j1');

    expect(res.status).toBe(200);
    expect(query.populate).toHaveBeenCalledWith('postedBy', 'name email');
    expect(res.body.data).toEqual({ _id: 'j1' });
  });

  it('returns 404 for an unknown job', async () => {
    Job.findById.mockReturnValue(chainableQuery(null));

    const res = await request(app).get('/api/jobs/missing');

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Job not found');
  });
});

describe('PUT /api/jobs/:id', () => {
  it('updates the job with validators enabled', async () => {
    Job.findByIdAndUpdate.mockResolvedValue({ _id: 'j1', status: 'closed' });

    const res = await request(app).put('/api/jobs/j1').send({ status: 'closed' });

    expect(res.status).toBe(200);
    expect(Job.findByIdAndUpdate).toHaveBeenCalledWith(
      'j1',
      { status: 'closed' },
      { new: true, runValidators: true },
    );
  });

  it('returns 404 when the job does not exist', async () => {
    Job.findByIdAndUpdate.mockResolvedValue(null);

    const res = await request(app).put('/api/jobs/missing').send({ status: 'closed' });

    expect(res.status).toBe(404);
  });

  it('surfaces a validation failure as a 500 from the error handler', async () => {
    Job.findByIdAndUpdate.mockRejectedValue(new Error('Validation failed'));

    const res = await request(app).put('/api/jobs/j1').send({ status: 'bogus' });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ success: false, message: 'Validation failed' });
  });
});

describe('DELETE /api/jobs/:id', () => {
  it('deletes the job', async () => {
    Job.findByIdAndDelete.mockResolvedValue({ _id: 'j1' });

    const res = await request(app).delete('/api/jobs/j1');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, message: 'Job deleted' });
    expect(Job.findByIdAndDelete).toHaveBeenCalledWith('j1');
  });
});
