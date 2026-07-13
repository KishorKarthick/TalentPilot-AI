const mongoose = require('mongoose');

const interviewSchema = new mongoose.Schema({
  candidate: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', required: true },
  job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
  resume: { type: mongoose.Schema.Types.ObjectId, ref: 'Resume' },
  scheduledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  interviewers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  type: { type: String, enum: ['phone', 'video', 'onsite', 'technical', 'hr'], required: true },
  round: { type: Number, default: 1 },
  scheduledAt: { type: Date, required: true },
  duration: { type: Number, default: 60 }, // minutes
  meetingLink: { type: String },
  location: { type: String },

  status: { type: String, enum: ['scheduled', 'completed', 'cancelled', 'rescheduled', 'no_show'], default: 'scheduled' },

  feedback: {
    rating: { type: Number, min: 1, max: 5 },
    technicalScore: Number,
    communicationScore: Number,
    cultureFitScore: Number,
    notes: String,
    recommendation: { type: String, enum: ['strong_yes', 'yes', 'maybe', 'no', 'strong_no'] },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    submittedAt: Date,
  },

  reminderSent: { type: Boolean, default: false },
  notes: String,
}, { timestamps: true });

module.exports = mongoose.model('Interview', interviewSchema);
