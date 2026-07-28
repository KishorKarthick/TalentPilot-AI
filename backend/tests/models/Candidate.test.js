const mongoose = require('mongoose');
const Candidate = require('../../models/Candidate');

const validCandidate = (overrides = {}) => new Candidate({
  name: 'Grace Hopper',
  email: 'grace@example.com',
  ...overrides,
});

describe('Candidate schema', () => {
  it('accepts a valid candidate and applies defaults', () => {
    const candidate = validCandidate();

    expect(candidate.validateSync()).toBeUndefined();
    expect(candidate.totalExperienceYears).toBe(0);
    expect(candidate.source).toBe('upload');
    expect(candidate.applications).toEqual([]);
  });

  it('requires name and email', () => {
    const errors = new Candidate({}).validateSync().errors;

    expect(Object.keys(errors).sort()).toEqual(['email', 'name']);
  });

  it('lowercases the email', () => {
    expect(validCandidate({ email: 'Grace@Example.COM' }).email).toBe('grace@example.com');
  });

  it.each(['upload', 'linkedin', 'referral', 'portal'])('allows source %s', (source) => {
    expect(validCandidate({ source }).validateSync()).toBeUndefined();
  });

  it('rejects an unknown source', () => {
    expect(validCandidate({ source: 'job-fair' }).validateSync().errors.source.kind).toBe('enum');
  });

  it('defaults an application to applied with an appliedAt timestamp', () => {
    const candidate = validCandidate({ applications: [{ job: new mongoose.Types.ObjectId() }] });

    expect(candidate.validateSync()).toBeUndefined();
    expect(candidate.applications[0].status).toBe('applied');
    expect(candidate.applications[0].appliedAt).toBeInstanceOf(Date);
  });

  it('rejects an unknown application status', () => {
    const candidate = validCandidate({
      applications: [{ job: new mongoose.Types.ObjectId(), status: 'ghosted' }],
    });

    expect(candidate.validateSync().errors['applications.0.status'].kind).toBe('enum');
  });

  it('defaults note timestamps', () => {
    const candidate = validCandidate({ notes: [{ text: 'Strong communicator' }] });

    expect(candidate.notes[0].createdAt).toBeInstanceOf(Date);
  });
});
