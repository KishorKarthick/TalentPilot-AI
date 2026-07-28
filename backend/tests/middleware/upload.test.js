const path = require('path');

jest.mock('multer', () => {
  const multer = jest.fn((options) => {
    multer.options = options;
    return { instance: true };
  });
  multer.diskStorage = jest.fn((config) => {
    multer.storageConfig = config;
    return { storage: true };
  });
  return multer;
});
jest.mock('fs');

// Re-requiring the middleware after resetModules yields fresh mock instances,
// so the multer mock is always read back from the current module registry.
const loadUpload = ({ dirExists = true } = {}) => {
  jest.resetModules();
  const fs = require('fs');
  fs.existsSync.mockReturnValue(dirExists);
  require('../../middleware/upload');
  return { multer: require('multer'), fs };
};

const uploadDir = path.join(__dirname, '../../uploads/resumes');

describe('upload middleware', () => {
  it('creates the upload directory when it is missing', () => {
    const { fs } = loadUpload({ dirExists: false });

    expect(fs.mkdirSync).toHaveBeenCalledWith(uploadDir, { recursive: true });
  });

  it('does not recreate an existing upload directory', () => {
    const { fs } = loadUpload({ dirExists: true });

    expect(fs.mkdirSync).not.toHaveBeenCalled();
  });

  it('limits files to 10MB each and 100 per request', () => {
    const { multer } = loadUpload();

    expect(multer.options.limits).toEqual({ fileSize: 10 * 1024 * 1024, files: 100 });
  });

  describe('storage', () => {
    let multer;

    beforeEach(() => {
      ({ multer } = loadUpload());
    });

    it('stores files in the resumes upload directory', () => {
      const cb = jest.fn();

      multer.storageConfig.destination({}, { originalname: 'cv.pdf' }, cb);

      expect(cb).toHaveBeenCalledWith(null, uploadDir);
    });

    it('generates a unique filename that keeps the original extension', () => {
      const cb = jest.fn();

      multer.storageConfig.filename({}, { originalname: 'My Résumé.PDF' }, cb);

      expect(cb).toHaveBeenCalledWith(null, expect.stringMatching(/^\d+-\d+\.PDF$/));
    });

    it('generates different filenames for identical uploads', () => {
      const cb = jest.fn();

      multer.storageConfig.filename({}, { originalname: 'cv.pdf' }, cb);
      multer.storageConfig.filename({}, { originalname: 'cv.pdf' }, cb);

      expect(cb.mock.calls[0][1]).not.toBe(cb.mock.calls[1][1]);
    });
  });

  describe('fileFilter', () => {
    let multer;

    beforeEach(() => {
      ({ multer } = loadUpload());
    });

    it.each(['resume.pdf', 'resume.PDF', 'resume.doc', 'resume.docx'])('accepts %s', (originalname) => {
      const cb = jest.fn();

      multer.options.fileFilter({}, { originalname }, cb);

      expect(cb).toHaveBeenCalledWith(null, true);
    });

    it.each(['resume.exe', 'resume.txt', 'resume.pdf.exe', 'resume'])('rejects %s', (originalname) => {
      const cb = jest.fn();

      multer.options.fileFilter({}, { originalname }, cb);

      expect(cb).toHaveBeenCalledWith(expect.any(Error));
      expect(cb.mock.calls[0][0].message).toBe('Only PDF, DOC, DOCX files allowed');
    });
  });
});
