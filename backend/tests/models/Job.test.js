const mongoose = require('mongoose');
const Job = require('../../models/Job');

const validJob = (overrides = {}) => new Job({
  title: 'Senior Engineer',
  company: 'Acme',
  description: 'Build things',
  postedBy: new mongoose.Types.ObjectId(),
  ...overrides,
});

describe('Job schema', () => {
  it('accepts a valid job and applies defaults', () => {
    const job = validJob();

    expect(job.validateSync()).toBeUndefined();
    expect(job.type).toBe('full-time');
    expect(job.status).toBe('active');
    expect(job.applicantCount).toBe(0);
    expect(job.salary.currency).toBe('USD');
  });

  it('requires title, company, description and postedBy', () => {
    const errors = new Job({}).validateSync().errors;

    expect(Object.keys(errors).sort()).toEqual(['company', 'description', 'postedBy', 'title']);
  });

  it('trims the title', () => {
    expect(validJob({ title: '  Senior Engineer  ' }).title).toBe('Senior Engineer');
  });

  it.each(['full-time', 'part-time', 'contract', 'internship', 'remote'])('allows type %s', (type) => {
    expect(validJob({ type }).validateSync()).toBeUndefined();
  });

  it.each(['active', 'paused', 'closed', 'draft'])('allows status %s', (status) => {
    expect(validJob({ status }).validateSync()).toBeUndefined();
  });

  it('rejects unknown type and status values', () => {
    const errors = validJob({ type: 'freelance', status: 'archived' }).validateSync().errors;

    expect(errors.type.kind).toBe('enum');
    expect(errors.status.kind).toBe('enum');
  });

  it('rejects a postedBy that is not an ObjectId', () => {
    const error = validJob({ postedBy: 'not-an-id' }).validateSync();

    expect(error.errors.postedBy.name).toBe('CastError');
  });

  it('casts requirements and skills to string arrays', () => {
    const job = validJob({ requirements: ['5 years', 10], skills: ['node'] });

    expect(job.requirements).toEqual(['5 years', '10']);
    expect(job.skills).toEqual(['node']);
  });

  it('declares a text index for search', () => {
    const indexes = Job.schema.indexes().map(([fields]) => fields);

    expect(indexes).toContainEqual({ title: 'text', description: 'text', skills: 'text' });
  });
});
