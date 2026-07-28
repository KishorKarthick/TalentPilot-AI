const mongoose = require('mongoose');
const Interview = require('../../models/Interview');

const oid = () => new mongoose.Types.ObjectId();

const validInterview = (overrides = {}) => new Interview({
  candidate: oid(),
  job: oid(),
  scheduledBy: oid(),
  type: 'technical',
  scheduledAt: new Date('2030-01-01T10:00:00Z'),
  ...overrides,
});

describe('Interview schema', () => {
  it('accepts a valid interview and applies defaults', () => {
    const interview = validInterview();

    expect(interview.validateSync()).toBeUndefined();
    expect(interview.round).toBe(1);
    expect(interview.duration).toBe(60);
    expect(interview.status).toBe('scheduled');
    expect(interview.reminderSent).toBe(false);
  });

  it('requires candidate, job, scheduledBy, type and scheduledAt', () => {
    const errors = new Interview({}).validateSync().errors;

    expect(Object.keys(errors).sort()).toEqual(['candidate', 'job', 'scheduledAt', 'scheduledBy', 'type']);
  });

  it.each(['phone', 'video', 'onsite', 'technical', 'hr'])('allows type %s', (type) => {
    expect(validInterview({ type }).validateSync()).toBeUndefined();
  });

  it('rejects an unknown type or status', () => {
    const errors = validInterview({ type: 'coffee-chat', status: 'pending' }).validateSync().errors;

    expect(errors.type.kind).toBe('enum');
    expect(errors.status.kind).toBe('enum');
  });

  it('casts a date string for scheduledAt', () => {
    const interview = validInterview({ scheduledAt: '2030-06-01T09:30:00Z' });

    expect(interview.validateSync()).toBeUndefined();
    expect(interview.scheduledAt.toISOString()).toBe('2030-06-01T09:30:00.000Z');
  });

  it('rejects an unparsable scheduledAt', () => {
    expect(validInterview({ scheduledAt: 'not-a-date' }).validateSync().errors.scheduledAt.name)
      .toBe('CastError');
  });

  describe('feedback', () => {
    it('accepts a full feedback payload', () => {
      const interview = validInterview({
        feedback: {
          rating: 4,
          technicalScore: 80,
          communicationScore: 75,
          cultureFitScore: 90,
          notes: 'Solid candidate',
          recommendation: 'yes',
          submittedBy: oid(),
          submittedAt: new Date(),
        },
      });

      expect(interview.validateSync()).toBeUndefined();
    });

    it.each([[0, 'min'], [6, 'max']])('rejects a rating of %i', (rating, kind) => {
      const error = validInterview({ feedback: { rating } }).validateSync();

      expect(error.errors['feedback.rating'].kind).toBe(kind);
    });

    it('rejects an unknown recommendation', () => {
      const error = validInterview({ feedback: { recommendation: 'perhaps' } }).validateSync();

      expect(error.errors['feedback.recommendation'].kind).toBe('enum');
    });
  });
});
