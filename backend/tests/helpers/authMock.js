// Shared state for the mocked auth middleware: route tests set the acting user
// and the mocked `protect` attaches it to the request.
const state = { user: { _id: 'rec1', role: 'recruiter', name: 'Rec' } };

const setUser = (user) => {
  state.user = user;
};

const authMiddlewareMock = () => ({
  protect: (req, res, next) => {
    req.user = state.user;
    next();
  },
  authorize: (...roles) => (req, res, next) => (roles.includes(req.user.role)
    ? next()
    : res.status(403).json({ success: false, message: 'Access denied' })),
});

module.exports = { setUser, authMiddlewareMock };
