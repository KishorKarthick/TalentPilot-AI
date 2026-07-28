jest.mock('jsonwebtoken');
jest.mock('../../models/User');

const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const { protect, authorize } = require('../../middleware/auth');

const mockRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

const mockFindById = (user) => {
  User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(user) });
};

describe('protect', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
  });

  it('rejects a request without an Authorization header', async () => {
    const res = mockRes();
    const next = jest.fn();

    await protect({ headers: {} }, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Not authorized' });
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects a header that is not a Bearer token', async () => {
    const res = mockRes();
    const next = jest.fn();

    await protect({ headers: { authorization: 'Basic abc123' } }, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(jwt.verify).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('attaches the user without its password and calls next on a valid token', async () => {
    const user = { _id: 'u1', role: 'recruiter', isActive: true };
    const select = jest.fn().mockResolvedValue(user);
    User.findById.mockReturnValue({ select });
    jwt.verify.mockReturnValue({ id: 'u1' });

    const req = { headers: { authorization: 'Bearer good.token' } };
    const res = mockRes();
    const next = jest.fn();

    await protect(req, res, next);

    expect(jwt.verify).toHaveBeenCalledWith('good.token', 'test-secret');
    expect(User.findById).toHaveBeenCalledWith('u1');
    expect(select).toHaveBeenCalledWith('-password');
    expect(req.user).toBe(user);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('rejects when the token is valid but the user no longer exists', async () => {
    jwt.verify.mockReturnValue({ id: 'gone' });
    mockFindById(null);
    const res = mockRes();
    const next = jest.fn();

    await protect({ headers: { authorization: 'Bearer good.token' } }, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'User not found or inactive' });
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects a deactivated user', async () => {
    jwt.verify.mockReturnValue({ id: 'u2' });
    mockFindById({ _id: 'u2', isActive: false });
    const res = mockRes();
    const next = jest.fn();

    await protect({ headers: { authorization: 'Bearer good.token' } }, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'User not found or inactive' });
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects an invalid or expired token', async () => {
    jwt.verify.mockImplementation(() => { throw new Error('jwt expired'); });
    const res = mockRes();
    const next = jest.fn();

    await protect({ headers: { authorization: 'Bearer bad.token' } }, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Invalid token' });
    expect(next).not.toHaveBeenCalled();
  });
});

describe('authorize', () => {
  it('calls next when the role is allowed', () => {
    const res = mockRes();
    const next = jest.fn();

    authorize('admin', 'recruiter')({ user: { role: 'recruiter' } }, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 403 when the role is not allowed', () => {
    const res = mockRes();
    const next = jest.fn();

    authorize('admin')({ user: { role: 'hiring_manager' } }, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Access denied' });
    expect(next).not.toHaveBeenCalled();
  });
});
