jest.mock('jsonwebtoken');
jest.mock('../../models/User');
jest.mock('../../middleware/auth', () => require('../helpers/authMock').authMiddlewareMock());

const request = require('supertest');
const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const { createTestApp } = require('../helpers/testApp');
const { chainableQuery } = require('../helpers/queryMock');
const { setUser } = require('../helpers/authMock');

const app = createTestApp('/api/auth', require('../../routes/auth'));

const asAdmin = () => setUser({ _id: 'admin1', role: 'admin' });
const asRecruiter = () => setUser({ _id: 'rec1', role: 'recruiter', name: 'Rec' });

beforeEach(() => {
  process.env.JWT_SECRET = 'test-secret';
  process.env.JWT_EXPIRE = '7d';
  jwt.sign.mockReturnValue('signed.jwt.token');
  asRecruiter();
});

describe('POST /api/auth/register', () => {
  const payload = { name: 'Ada', email: 'ada@example.com', password: 'secret123' };

  it('creates a recruiter by default and returns a token', async () => {
    User.findOne.mockResolvedValue(null);
    User.create.mockResolvedValue({ _id: 'u1', ...payload, role: 'recruiter' });

    const res = await request(app).post('/api/auth/register').send(payload);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ success: true, token: 'signed.jwt.token' });
    expect(User.create).toHaveBeenCalledWith(expect.objectContaining({ role: 'recruiter' }));
    expect(jwt.sign).toHaveBeenCalledWith({ id: 'u1' }, 'test-secret', { expiresIn: '7d' });
  });

  it('keeps a non-admin role supplied by the caller', async () => {
    User.findOne.mockResolvedValue(null);
    User.create.mockResolvedValue({ _id: 'u2' });

    await request(app).post('/api/auth/register').send({ ...payload, role: 'hiring_manager' });

    expect(User.create).toHaveBeenCalledWith(expect.objectContaining({ role: 'hiring_manager' }));
  });

  it('blocks public admin registration', async () => {
    User.findOne.mockResolvedValue(null);

    const res = await request(app).post('/api/auth/register').send({ ...payload, role: 'admin' });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/existing admin/);
    expect(User.create).not.toHaveBeenCalled();
  });

  it('rejects a duplicate email', async () => {
    User.findOne.mockResolvedValue({ _id: 'existing' });

    const res = await request(app).post('/api/auth/register').send(payload);

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Email already registered');
    expect(User.create).not.toHaveBeenCalled();
  });

  it.each([
    ['a missing name', { ...payload, name: '' }],
    ['an invalid email', { ...payload, email: 'not-an-email' }],
    ['a short password', { ...payload, password: '12345' }],
  ])('rejects %s with validation errors', async (_label, body) => {
    const res = await request(app).post('/api/auth/register').send(body);

    expect(res.status).toBe(400);
    expect(res.body.errors.length).toBeGreaterThan(0);
    expect(User.create).not.toHaveBeenCalled();
  });
});

describe('POST /api/auth/login', () => {
  const credentials = { email: 'ada@example.com', password: 'secret123' };

  const mockUser = (matches) => {
    const user = {
      _id: 'u1',
      matchPassword: jest.fn().mockResolvedValue(matches),
      save: jest.fn().mockResolvedValue(true),
    };
    User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(user) });
    return user;
  };

  it('returns a token and stamps lastLogin on success', async () => {
    const user = mockUser(true);

    const res = await request(app).post('/api/auth/login').send(credentials);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, token: 'signed.jwt.token' });
    expect(user.matchPassword).toHaveBeenCalledWith('secret123');
    expect(user.lastLogin).toBeInstanceOf(Date);
    expect(user.save).toHaveBeenCalled();
  });

  it('rejects an unknown email', async () => {
    User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });

    const res = await request(app).post('/api/auth/login').send(credentials);

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid credentials');
  });

  it('rejects a wrong password', async () => {
    const user = mockUser(false);

    const res = await request(app).post('/api/auth/login').send(credentials);

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid credentials');
    expect(user.save).not.toHaveBeenCalled();
  });

  it('rejects a malformed request body', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'nope', password: '' });

    expect(res.status).toBe(400);
    expect(res.body.errors).toHaveLength(2);
  });
});

describe('GET /api/auth/me', () => {
  it('returns the authenticated user', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ _id: 'rec1', role: 'recruiter' });
  });
});

describe('PUT /api/auth/profile', () => {
  it('updates only the editable profile fields', async () => {
    User.findByIdAndUpdate.mockResolvedValue({ _id: 'rec1', name: 'New Name' });

    const res = await request(app)
      .put('/api/auth/profile')
      .send({ name: 'New Name', company: 'Acme', avatar: 'a.png', role: 'admin' });

    expect(res.status).toBe(200);
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
      'rec1',
      { name: 'New Name', company: 'Acme', avatar: 'a.png' },
      { new: true },
    );
  });
});

describe('admin-only user management', () => {
  it('lets an admin create a user with an explicit role', async () => {
    asAdmin();
    User.findOne.mockResolvedValue(null);
    User.create.mockResolvedValue({ _id: 'u9', role: 'admin' });

    const res = await request(app)
      .post('/api/auth/users/create')
      .send({ name: 'Root', email: 'root@example.com', role: 'admin' });

    expect(res.status).toBe(201);
    expect(User.create).toHaveBeenCalledWith(expect.objectContaining({
      role: 'admin',
      password: 'TalentPilot@123',
    }));
  });

  it('rejects an admin-created user whose email exists', async () => {
    asAdmin();
    User.findOne.mockResolvedValue({ _id: 'existing' });

    const res = await request(app)
      .post('/api/auth/users/create')
      .send({ name: 'Root', email: 'root@example.com' });

    expect(res.status).toBe(400);
    expect(User.create).not.toHaveBeenCalled();
  });

  it('lists users newest first for an admin', async () => {
    asAdmin();
    const query = chainableQuery([{ _id: 'u1' }]);
    User.find.mockReturnValue(query);

    const res = await request(app).get('/api/auth/users');

    expect(res.status).toBe(200);
    expect(query.sort).toHaveBeenCalledWith('-createdAt');
    expect(res.body.data).toEqual([{ _id: 'u1' }]);
  });

  it('updates role and isActive, ignoring other fields', async () => {
    asAdmin();
    User.findByIdAndUpdate.mockResolvedValue({ _id: 'u1', role: 'admin' });

    const res = await request(app)
      .patch('/api/auth/users/u1')
      .send({ role: 'admin', isActive: false, email: 'hacker@example.com' });

    expect(res.status).toBe(200);
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
      'u1',
      { role: 'admin', isActive: false },
      { new: true },
    );
  });

  it('ignores a non-boolean isActive', async () => {
    asAdmin();
    User.findByIdAndUpdate.mockResolvedValue({ _id: 'u1' });

    await request(app).patch('/api/auth/users/u1').send({ isActive: 'false' });

    expect(User.findByIdAndUpdate).toHaveBeenCalledWith('u1', {}, { new: true });
  });

  it('returns 404 when the user to update does not exist', async () => {
    asAdmin();
    User.findByIdAndUpdate.mockResolvedValue(null);

    const res = await request(app).patch('/api/auth/users/missing').send({ role: 'admin' });

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('User not found');
  });

  it.each([
    ['GET', '/api/auth/users'],
    ['POST', '/api/auth/users/create'],
    ['PATCH', '/api/auth/users/u1'],
  ])('denies %s %s to non-admins', async (method, url) => {
    asRecruiter();

    const res = await request(app)[method.toLowerCase()](url).send({});

    expect(res.status).toBe(403);
    expect(res.body.message).toBe('Access denied');
  });
});
