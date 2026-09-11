const mongoose = require('mongoose');
const crypto = require('crypto');

const resumeSchema = new mongoose.Schema({
  candidate: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate' },
  job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job' },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // File Info
  originalName: { type: String, required: true },
  fileUrl: { type: String, required: true },
  fileType: { type: String, enum: ['pdf', 'docx', 'doc'] },
  fileSize: { type: Number },
  contentHash: { type: String }, // For duplicate detection

  // Raw extracted text
  rawText: { type: String },

  // AI Extracted Data
  extractedData: {
    name: String,
    email: String,
    phone: String,
    location: String,
    summary: String,
    skills: [String],
    experience: [{
      company: String,
      title: String,
      duration: String,
      description: String,
      years: Number,
    }],
    education: [{
      institution: String,
      degree: String,
      field: String,
      year: String,
      gpa: String,
    }],
    projects: [{
      name: String,
      description: String,
      technologies: [String],
    }],
    certifications: [String],
    languages: [String],
    totalExperienceYears: Number,
  },

  // ATS Scoring
  atsScore: { type: Number, min: 0, max: 100 },
  matchScore: { type: Number, min: 0, max: 100 },
  scoreBreakdown: {
    technicalSkills: Number, // max 40
    experience: Number,      // max 20
    education: Number,       // max 15
    jdSimilarity: Number,    // max 20
    projects: Number,        // max 5
    skillsMatch: Number,
    experienceMatch: Number,
    educationMatch: Number,
    keywordsMatch: Number,
  },
  skillComparison: [{
    skill: String,
    matched: Boolean,
  }],
  matchedSkills: [String],
  missingSkills: [String],
  whyShortlisted: String,
  aiSummary: String,

  // Status
  status: {
    type: String,
    enum: ['pending', 'processing', 'reviewed', 'shortlisted', 'rejected', 'hired'],
    default: 'pending',
  },
  isDuplicate: { type: Boolean, default: false },
  duplicateOf: { type: mongoose.Schema.Types.ObjectId, ref: 'Resume' },

  processingError: String,
}, { timestamps: true });

resumeSchema.index({ contentHash: 1 });
resumeSchema.index({ job: 1, matchScore: -1 });
resumeSchema.index({ 'extractedData.email': 1 });

module.exports = mongoose.model('Resume', resumeSchema);
