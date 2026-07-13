const mongoose = require('mongoose');

const candidateSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  phone: { type: String },
  location: { type: String },
  skills: [String],
  totalExperienceYears: { type: Number, default: 0 },
  currentTitle: { type: String },
  resumes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Resume' }],
  applications: [{
    job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job' },
    resume: { type: mongoose.Schema.Types.ObjectId, ref: 'Resume' },
    status: { type: String, enum: ['applied', 'screening', 'interview', 'offer', 'hired', 'rejected'], default: 'applied' },
    appliedAt: { type: Date, default: Date.now },
  }],
  tags: [String],
  notes: [{ text: String, addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, createdAt: { type: Date, default: Date.now } }],
  source: { type: String, enum: ['upload', 'linkedin', 'referral', 'portal'], default: 'upload' },
}, { timestamps: true });

candidateSchema.index({ email: 1 });
candidateSchema.index({ skills: 1 });

module.exports = mongoose.model('Candidate', candidateSchema);
