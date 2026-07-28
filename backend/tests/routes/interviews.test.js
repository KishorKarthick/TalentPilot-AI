jest.mock('../../models/Interview');
jest.mock('../../middleware/auth', () => require('../helpers/authMock').authMiddlewareMock());
jest.mock('nodemailer', () => {
  const sendMail = jest.fn().mockResolvedValue({ messageId: 'test' });
  return {
    sendMail,
    createTransport: jest.fn(() => ({ sendMail })),
  };
});

const request = require('supertest');
const nodemailer = require('nodemailer');
const Interview = require('../../models/Interview');
const { createTestApp } = require('../helpers/testApp');
const { chainableQuery } = require('../helpers/queryMock');
const { setUser } = require('../helpers/authMock');

const app = createTestApp('/api/interviews', require('../../routes/interviews'));
const { sendMail } = nodemailer;

const populatedInterview = (overrides = {}) => ({
  _id: 'i1',
  type: 'technical',
  scheduledAt: '2030-01-01T10:00:00.000Z',
  duration: 60,
  candidate: { name: 'Grace', email: 'grace@example.com' },
  job: { title: 'Engineer', company: 'Acme' },
  ...overrides,
});

beforeEach(() => {
  setUser({ _id: 'rec1', role: 'recruiter' });
  sendMail.mockResolvedValue({ messageId: 'test' });
});

describe('POST /api/interviews', () => {
  const mockCreate = (populated) => {
    const created = { ...populated, populate: jest.fn().mockResolvedValue(populated) };
    Interview.create.mockResolvedValue(created);
    return created;
  };

  it('schedules an interview for the authenticated recruiter', async () => {
    const populated = populatedInterview();
    const created = mockCreate(populated);

    const res = await request(app)
      .post('/api/interviews')
      .send({ candidate: 'c1', job: 'j1', type: 'technical', scheduledAt: populated.scheduledAt });

    expect(res.status).toBe(201);
    expect(Interview.create).toHaveBeenCalledWith(expect.objectContaining({ scheduledBy: 'rec1' }));
    expect(created.populate).toHaveBeenCalledWith([
      { path: 'candidate', select: 'name email' },
      { path: 'job', select: 'title company' },
    ]);
    expect(res.body.data).toMatchObject({ _id: 'i1' });
  });

  it('emails the candidate with the interview details', async () => {
    mockCreate(populatedInterview({ meetingLink: 'https://meet.example.com/abc' }));

    await request(app).post('/api/interviews').send({ candidate: 'c1', job: 'j1' });

    expect(sendMail).toHaveBeenCalledTimes(1);
    const mail = sendMail.mock.calls[0][0];
    expect(mail.to).toBe('grace@example.com');
    expect(mail.subject).toBe('Interview Scheduled - Engineer');
    expect(mail.html).toContain('Grace');
    expect(mail.html).toContain('technical');
    expect(mail.html).toContain('https://meet.example.com/abc');
  });

  it('falls back to a generic subject when the job is missing', async () => {
    mockCreate(populatedInterview({ job: null }));

    await request(app).post('/api/interviews').send({ candidate: 'c1' });

    expect(sendMail.mock.calls[0][0].subject).toBe('Interview Scheduled - Position');
  });

  it('omits the meeting link and location rows when not provided', async () => {
    mockCreate(populatedInterview());

    await request(app).post('/api/interviews').send({ candidate: 'c1', job: 'j1' });

    const { html } = sendMail.mock.calls[0][0];
    expect(html).not.toContain('Meeting Link');
    expect(html).not.toContain('Location');
  });

  it('includes the location row for onsite interviews', async () => {
    mockCreate(populatedInterview({ type: 'onsite', location: 'Acme HQ, Floor 3' }));

    await request(app).post('/api/interviews').send({ candidate: 'c1', job: 'j1' });

    expect(sendMail.mock.calls[0][0].html).toContain('Acme HQ, Floor 3');
  });

  it('still returns 201 when the notification email fails', async () => {
    mockCreate(populatedInterview());
    sendMail.mockRejectedValue(new Error('SMTP unavailable'));
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const res = await request(app).post('/api/interviews').send({ candidate: 'c1', job: 'j1' });

    expect(res.status).toBe(201);
    expect(errorSpy).toHaveBeenCalledWith('Email send failed:', 'SMTP unavailable');
    errorSpy.mockRestore();
  });
});

describe('GET /api/interviews', () => {
  it('returns interviews sorted by schedule with relations populated', async () => {
    const query = chainableQuery([{ _id: 'i1' }]);
    Interview.find.mockReturnValue(query);

    const res = await request(app).get('/api/interviews');

    expect(res.status).toBe(200);
    expect(Interview.find).toHaveBeenCalledWith({});
    expect(query.sort).toHaveBeenCalledWith('scheduledAt');
    expect(query.populate).toHaveBeenCalledWith('candidate', 'name email');
    expect(res.body.data).toEqual([{ _id: 'i1' }]);
  });

  it('filters by status, candidate and job', async () => {
    Interview.find.mockReturnValue(chainableQuery([]));

    await request(app).get('/api/interviews?status=scheduled&candidateId=c1&jobId=j1');

    expect(Interview.find).toHaveBeenCalledWith({
      status: 'scheduled',
      candidate: 'c1',
      job: 'j1',
    });
  });

  it('builds a date range query from the from and to params', async () => {
    Interview.find.mockReturnValue(chainableQuery([]));

    await request(app).get('/api/interviews?from=2030-01-01&to=2030-02-01');

    expect(Interview.find).toHaveBeenCalledWith({
      scheduledAt: { $gte: new Date('2030-01-01'), $lte: new Date('2030-02-01') },
    });
  });

  it.each([
    ['from=2030-01-01', { $gte: new Date('2030-01-01') }],
    ['to=2030-02-01', { $lte: new Date('2030-02-01') }],
  ])('supports the open-ended date range %s', async (queryString, expected) => {
    Interview.find.mockReturnValue(chainableQuery([]));

    await request(app).get(`/api/interviews?${queryString}`);

    expect(Interview.find).toHaveBeenCalledWith({ scheduledAt: expected });
  });
});

describe('GET /api/interviews/:id', () => {
  it('returns a single interview', async () => {
    const query = chainableQuery({ _id: 'i1' });
    Interview.findById.mockReturnValue(query);

    const res = await request(app).get('/api/interviews/i1');

    expect(res.status).toBe(200);
    expect(query.populate).toHaveBeenCalledWith('interviewers', 'name email');
  });

  it('returns 404 for an unknown interview', async () => {
    Interview.findById.mockReturnValue(chainableQuery(null));

    const res = await request(app).get('/api/interviews/missing');

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Interview not found');
  });
});

describe('PUT /api/interviews/:id', () => {
  it('updates the interview', async () => {
    Interview.findByIdAndUpdate.mockResolvedValue({ _id: 'i1', status: 'rescheduled' });

    const res = await request(app).put('/api/interviews/i1').send({ status: 'rescheduled' });

    expect(res.status).toBe(200);
    expect(Interview.findByIdAndUpdate).toHaveBeenCalledWith(
      'i1',
      { status: 'rescheduled' },
      { new: true },
    );
  });
});

describe('POST /api/interviews/:id/feedback', () => {
  it('stores feedback, stamps the submitter and completes the interview', async () => {
    Interview.findByIdAndUpdate.mockResolvedValue({ _id: 'i1', status: 'completed' });

    const res = await request(app)
      .post('/api/interviews/i1/feedback')
      .send({ rating: 4, recommendation: 'yes', notes: 'Strong' });

    expect(res.status).toBe(200);
    const [id, update, options] = Interview.findByIdAndUpdate.mock.calls[0];
    expect(id).toBe('i1');
    expect(options).toEqual({ new: true });
    expect(update.status).toBe('completed');
    expect(update.feedback).toMatchObject({
      rating: 4,
      recommendation: 'yes',
      notes: 'Strong',
      submittedBy: 'rec1',
    });
    expect(update.feedback.submittedAt).toBeInstanceOf(Date);
  });
});
