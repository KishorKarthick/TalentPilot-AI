const mongoose = require('mongoose');
const Resume = require('../../models/Resume');

const validResume = (overrides = {}) => new Resume({
  uploadedBy: new mongoose.Types.ObjectId(),
  originalName: 'grace-hopper.pdf',
  fileUrl: 'uploads/resumes/123.pdf',
  ...overrides,
});

describe('Resume schema', () => {
  it('accepts a valid resume and applies defaults', () => {
    const resume = validResume();

    expect(resume.validateSync()).toBeUndefined();
    expect(resume.status).toBe('pending');
    expect(resume.isDuplicate).toBe(false);
  });

  it('requires uploadedBy, originalName and fileUrl', () => {
    const errors = new Resume({}).validateSync().errors;

    expect(Object.keys(errors).sort()).toEqual(['fileUrl', 'originalName', 'uploadedBy']);
  });

  it.each(['pdf', 'docx', 'doc'])('allows fileType %s', (fileType) => {
    expect(validResume({ fileType }).validateSync()).toBeUndefined();
  });

  it('rejects an unsupported fileType', () => {
    expect(validResume({ fileType: 'txt' }).validateSync().errors.fileType.kind).toBe('enum');
  });

  it.each(['pending', 'processing', 'reviewed', 'shortlisted', 'rejected', 'hired'])(
    'allows status %s',
    (status) => {
      expect(validResume({ status }).validateSync()).toBeUndefined();
    },
  );

  it('rejects an unknown status', () => {
    expect(validResume({ status: 'interviewing' }).validateSync().errors.status.kind).toBe('enum');
  });

  it.each([
    ['atsScore', -1, 'min'],
    ['atsScore', 101, 'max'],
    ['matchScore', -5, 'min'],
    ['matchScore', 150, 'max'],
  ])('rejects %s of %i', (field, value, kind) => {
    const error = validResume({ [field]: value }).validateSync();

    expect(error.errors[field].kind).toBe(kind);
  });

  it.each([0, 50, 100])('accepts a score of %i', (score) => {
    expect(validResume({ atsScore: score, matchScore: score }).validateSync()).toBeUndefined();
  });

  it('stores AI extracted data including nested experience and education', () => {
    const resume = validResume({
      extractedData: {
        name: 'Grace Hopper',
        email: 'grace@example.com',
        skills: ['cobol', 'compilers'],
        experience: [{ company: 'Navy', title: 'Rear Admiral', duration: '1943-1986', years: 43 }],
        education: [{ institution: 'Yale', degree: 'PhD', field: 'Mathematics', year: '1934' }],
        certifications: ['none'],
        totalExperienceYears: 43,
      },
    });

    expect(resume.validateSync()).toBeUndefined();
    expect(resume.extractedData.skills).toEqual(['cobol', 'compilers']);
    expect(resume.extractedData.experience[0].years).toBe(43);
    expect(resume.extractedData.education[0].institution).toBe('Yale');
  });

  it('indexes the fields used for duplicate detection and ranking', () => {
    const indexes = Resume.schema.indexes().map(([fields]) => fields);

    expect(indexes).toContainEqual({ contentHash: 1 });
    expect(indexes).toContainEqual({ job: 1, matchScore: -1 });
    expect(indexes).toContainEqual({ 'extractedData.email': 1 });
  });
});
