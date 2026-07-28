// Shared state for the mocked multer instance: route tests set the files that
// the mocked `upload.array()` middleware attaches to the request.
const state = { files: [] };

const setFiles = (files) => {
  state.files = files;
};

const uploadMock = () => ({
  array: () => (req, res, next) => {
    req.files = state.files;
    next();
  },
});

module.exports = { setFiles, uploadMock };
