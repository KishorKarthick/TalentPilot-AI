const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  company: { type: String, required: true },
  department: { type: String },
  location: { type: String },
  type: { type: String, enum: ['full-time', 'part-time', 'contract', 'internship', 'remote'], default: 'full-time' },
  description: { type: String, required: true },
  requirements: [String],
  skills: [String],
  experience: { min: Number, max: Number },
  salary: { min: Number, max: Number, currency: { type: String, default: 'USD' } },
  status: { type: String, enum: ['active', 'paused', 'closed', 'draft'], default: 'active' },
  postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  applicantCount: { type: Number, default: 0 },
  deadline: { type: Date },
}, { timestamps: true });

jobSchema.index({ title: 'text', description: 'text', skills: 'text' });

module.exports = mongoose.model('Job', jobSchema);
