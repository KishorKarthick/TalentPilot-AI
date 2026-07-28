const crypto = require('crypto');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../uploads/resumes');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const ALLOWED_TYPES = {
  '.pdf': ['application/pdf'],
  '.doc': ['application/msword', 'application/octet-stream'],
  '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/octet-stream'],
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${crypto.randomUUID()}`;
    cb(null, `${unique}${path.extname(file.originalname).toLowerCase()}`);
  },
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedMimes = ALLOWED_TYPES[ext];
  if (!allowedMimes || !allowedMimes.includes(file.mimetype)) {
    const err = new Error('Only PDF, DOC, DOCX files allowed');
    err.statusCode = 400;
    return cb(err);
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024, files: 100, fields: 10 }, // 10MB per file, max 100 files
});

// Surfaces upload rejections as 400s instead of falling through to the 500 handler
const uploadResumes = (req, res, next) =>
  upload.array('resumes', 100)(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) err.statusCode = 400;
    next(err);
  });

module.exports = { uploadResumes };
