require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// ── Models ──────────────────────────────────────────────────────────────────
const User = mongoose.model('User', new mongoose.Schema({
  name: String, email: { type: String, unique: true }, password: String,
  role: String, company: String, isActive: { type: Boolean, default: true }, lastLogin: Date,
}, { timestamps: true }));

const Job = mongoose.model('Job', new mongoose.Schema({
  title: String, company: String, department: String, location: String,
  type: String, description: String, skills: [String], status: String,
  postedBy: mongoose.Schema.Types.ObjectId, applicantCount: { type: Number, default: 0 },
  experience: { min: Number, max: Number }, salary: { min: Number, max: Number, currency: String },
  deadline: Date,
}, { timestamps: true }));

const Candidate = mongoose.model('Candidate', new mongoose.Schema({
  name: String, email: { type: String, unique: true }, phone: String,
  location: String, skills: [String], totalExperienceYears: Number,
  currentTitle: String, resumes: [mongoose.Schema.Types.ObjectId],
  applications: [{ job: mongoose.Schema.Types.ObjectId, resume: mongoose.Schema.Types.ObjectId, status: String, appliedAt: Date }],
  tags: [String], notes: [{ text: String, addedBy: mongoose.Schema.Types.ObjectId, createdAt: Date }],
  source: String,
}, { timestamps: true }));

const Resume = mongoose.model('Resume', new mongoose.Schema({
  candidate: mongoose.Schema.Types.ObjectId, job: mongoose.Schema.Types.ObjectId,
  uploadedBy: mongoose.Schema.Types.ObjectId, originalName: String, fileUrl: String,
  fileType: String, fileSize: Number, contentHash: String, rawText: String,
  extractedData: mongoose.Schema.Types.Mixed,
  atsScore: Number, matchScore: Number,
  scoreBreakdown: mongoose.Schema.Types.Mixed,
  skillComparison: [mongoose.Schema.Types.Mixed],
  matchedSkills: [String], missingSkills: [String],
  whyShortlisted: String, aiSummary: String,
  status: String, isDuplicate: { type: Boolean, default: false },
}, { timestamps: true }));

const Interview = mongoose.model('Interview', new mongoose.Schema({
  candidate: mongoose.Schema.Types.ObjectId, job: mongoose.Schema.Types.ObjectId,
  resume: mongoose.Schema.Types.ObjectId, scheduledBy: mongoose.Schema.Types.ObjectId,
  type: String, round: Number, scheduledAt: Date, duration: Number,
  meetingLink: String, status: String,
  feedback: { rating: Number, technicalScore: Number, communicationScore: Number, cultureFitScore: Number, notes: String, recommendation: String, submittedBy: mongoose.Schema.Types.ObjectId, submittedAt: Date },
}, { timestamps: true }));

// ── Seed Data ────────────────────────────────────────────────────────────────
const JOBS = [
  {
    title: 'Senior Full Stack Developer', company: 'TechNova Inc.', department: 'Engineering',
    location: 'San Francisco, CA', type: 'full-time', status: 'active',
    skills: ['React', 'Node.js', 'MongoDB', 'TypeScript', 'AWS', 'Docker'],
    description: 'We are looking for a Senior Full Stack Developer to join our growing engineering team. You will be responsible for building scalable web applications using React and Node.js. Experience with cloud infrastructure (AWS) and containerization (Docker) is required.',
    experience: { min: 4, max: 8 }, salary: { min: 120000, max: 160000, currency: 'USD' },
    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  },
  {
    title: 'Machine Learning Engineer', company: 'DataMind AI', department: 'AI/ML',
    location: 'Remote', type: 'remote', status: 'active',
    skills: ['Python', 'TensorFlow', 'PyTorch', 'Scikit-learn', 'SQL', 'MLOps'],
    description: 'Join our AI team to build and deploy machine learning models at scale. You will work on NLP, computer vision, and recommendation systems. Strong Python skills and experience with deep learning frameworks required.',
    experience: { min: 3, max: 6 }, salary: { min: 130000, max: 170000, currency: 'USD' },
    deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
  },
  {
    title: 'DevOps Engineer', company: 'CloudBase Systems', department: 'Infrastructure',
    location: 'Austin, TX', type: 'full-time', status: 'active',
    skills: ['Kubernetes', 'Docker', 'AWS', 'Terraform', 'CI/CD', 'Linux', 'Python'],
    description: 'We need a DevOps Engineer to manage our cloud infrastructure and CI/CD pipelines. You will work with Kubernetes clusters, automate deployments, and ensure 99.9% uptime for our platform.',
    experience: { min: 3, max: 7 }, salary: { min: 110000, max: 145000, currency: 'USD' },
    deadline: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
  },
  {
    title: 'UI/UX Designer', company: 'PixelCraft Studio', department: 'Design',
    location: 'New York, NY', type: 'full-time', status: 'active',
    skills: ['Figma', 'Adobe XD', 'Sketch', 'Prototyping', 'User Research', 'CSS'],
    description: 'Looking for a creative UI/UX Designer to craft beautiful and intuitive user experiences. You will collaborate with product and engineering teams to design web and mobile interfaces.',
    experience: { min: 2, max: 5 }, salary: { min: 85000, max: 115000, currency: 'USD' },
    deadline: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
  },
  {
    title: 'Backend Engineer (Python)', company: 'FinTech Solutions', department: 'Engineering',
    location: 'Chicago, IL', type: 'full-time', status: 'active',
    skills: ['Python', 'FastAPI', 'PostgreSQL', 'Redis', 'Microservices', 'REST APIs'],
    description: 'We are hiring a Backend Engineer to build high-performance financial APIs. You will design microservices, optimize database queries, and ensure security compliance for our fintech platform.',
    experience: { min: 3, max: 6 }, salary: { min: 115000, max: 150000, currency: 'USD' },
    deadline: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000),
  },
  {
    title: 'Product Manager', company: 'GrowthLab', department: 'Product',
    location: 'Seattle, WA', type: 'full-time', status: 'paused',
    skills: ['Product Strategy', 'Agile', 'Jira', 'Data Analysis', 'Roadmapping', 'Stakeholder Management'],
    description: 'Seeking an experienced Product Manager to lead our core product team. You will define product vision, prioritize features, and work closely with engineering and design teams.',
    experience: { min: 4, max: 8 }, salary: { min: 125000, max: 165000, currency: 'USD' },
    deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
  },
];

const CANDIDATES = [
  {
    name: 'Alex Johnson', email: 'alex.johnson@email.com', phone: '+1-555-0101',
    location: 'San Francisco, CA', currentTitle: 'Full Stack Developer',
    skills: ['React', 'Node.js', 'MongoDB', 'TypeScript', 'AWS', 'Docker', 'GraphQL'],
    totalExperienceYears: 6, source: 'upload', tags: ['shortlisted', 'strong'],
    matchScore: 92, atsScore: 88, jobIndex: 0, appStatus: 'shortlisted',
  },
  {
    name: 'Priya Sharma', email: 'priya.sharma@email.com', phone: '+1-555-0102',
    location: 'Remote', currentTitle: 'ML Engineer',
    skills: ['Python', 'TensorFlow', 'PyTorch', 'Scikit-learn', 'SQL', 'MLOps', 'NLP'],
    totalExperienceYears: 5, source: 'linkedin', tags: ['top-candidate'],
    matchScore: 89, atsScore: 85, jobIndex: 1, appStatus: 'interview',
  },
  {
    name: 'Marcus Williams', email: 'marcus.williams@email.com', phone: '+1-555-0103',
    location: 'Austin, TX', currentTitle: 'DevOps Engineer',
    skills: ['Kubernetes', 'Docker', 'AWS', 'Terraform', 'CI/CD', 'Linux'],
    totalExperienceYears: 4, source: 'upload', tags: ['reviewed'],
    matchScore: 85, atsScore: 82, jobIndex: 2, appStatus: 'screening',
  },
  {
    name: 'Sarah Chen', email: 'sarah.chen@email.com', phone: '+1-555-0104',
    location: 'New York, NY', currentTitle: 'Senior UI/UX Designer',
    skills: ['Figma', 'Adobe XD', 'Sketch', 'Prototyping', 'User Research', 'CSS', 'Illustrator'],
    totalExperienceYears: 5, source: 'referral', tags: ['shortlisted'],
    matchScore: 91, atsScore: 87, jobIndex: 3, appStatus: 'shortlisted',
  },
  {
    name: 'David Park', email: 'david.park@email.com', phone: '+1-555-0105',
    location: 'Chicago, IL', currentTitle: 'Python Backend Developer',
    skills: ['Python', 'FastAPI', 'PostgreSQL', 'Redis', 'Microservices', 'REST APIs', 'Docker'],
    totalExperienceYears: 4, source: 'upload', tags: ['reviewed'],
    matchScore: 87, atsScore: 83, jobIndex: 4, appStatus: 'reviewed',
  },
  {
    name: 'Emily Rodriguez', email: 'emily.rodriguez@email.com', phone: '+1-555-0106',
    location: 'San Francisco, CA', currentTitle: 'React Developer',
    skills: ['React', 'JavaScript', 'CSS', 'Node.js', 'MongoDB', 'Redux'],
    totalExperienceYears: 3, source: 'portal', tags: [],
    matchScore: 74, atsScore: 71, jobIndex: 0, appStatus: 'applied',
  },
  {
    name: 'James Kim', email: 'james.kim@email.com', phone: '+1-555-0107',
    location: 'Remote', currentTitle: 'Data Scientist',
    skills: ['Python', 'Scikit-learn', 'SQL', 'Pandas', 'NumPy', 'Tableau'],
    totalExperienceYears: 3, source: 'upload', tags: [],
    matchScore: 68, atsScore: 72, jobIndex: 1, appStatus: 'applied',
  },
  {
    name: 'Aisha Patel', email: 'aisha.patel@email.com', phone: '+1-555-0108',
    location: 'Austin, TX', currentTitle: 'Cloud Engineer',
    skills: ['AWS', 'Azure', 'Docker', 'Kubernetes', 'Python', 'Terraform'],
    totalExperienceYears: 5, source: 'linkedin', tags: ['shortlisted'],
    matchScore: 83, atsScore: 80, jobIndex: 2, appStatus: 'shortlisted',
  },
  {
    name: 'Tom Bennett', email: 'tom.bennett@email.com', phone: '+1-555-0109',
    location: 'New York, NY', currentTitle: 'Product Designer',
    skills: ['Figma', 'Sketch', 'Prototyping', 'CSS', 'HTML', 'User Research'],
    totalExperienceYears: 2, source: 'upload', tags: [],
    matchScore: 62, atsScore: 65, jobIndex: 3, appStatus: 'applied',
  },
  {
    name: 'Nina Okafor', email: 'nina.okafor@email.com', phone: '+1-555-0110',
    location: 'Chicago, IL', currentTitle: 'Software Engineer',
    skills: ['Python', 'Django', 'PostgreSQL', 'REST APIs', 'Git', 'Linux'],
    totalExperienceYears: 3, source: 'referral', tags: [],
    matchScore: 71, atsScore: 69, jobIndex: 4, appStatus: 'screening',
  },
];

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB...');

  // Clear existing seed data (keep users)
  await Job.deleteMany({});
  await Candidate.deleteMany({});
  await Resume.deleteMany({});
  await Interview.deleteMany({});
  console.log('Cleared old seed data...');

  // Get admin user
  const AdminUser = mongoose.models.User || mongoose.model('User', new mongoose.Schema({
    name: String, email: String, password: String, role: String,
    company: String, isActive: Boolean,
  }, { timestamps: true }));
  let admin = await AdminUser.findOne({ role: 'admin' });

  if (!admin) {
    console.log('No admin found. Run seedAdmin.js first.');
    process.exit(1);
  }

  // Create Jobs
  const createdJobs = [];
  for (const jobData of JOBS) {
    const job = await Job.create({ ...jobData, postedBy: admin._id });
    createdJobs.push(job);
    console.log(`✅ Job: ${job.title}`);
  }

  // Create Candidates + Resumes
  const createdCandidates = [];
  for (const c of CANDIDATES) {
    const { matchScore, atsScore, jobIndex, appStatus, ...candidateData } = c;
    const job = createdJobs[jobIndex];

    const candidate = await Candidate.create({
      ...candidateData,
      applications: [{ job: job._id, status: appStatus, appliedAt: new Date(Date.now() - Math.random() * 20 * 24 * 60 * 60 * 1000) }],
    });

    const jobSkills = job.skills;
    const matchedSkills = candidateData.skills.filter(s => jobSkills.includes(s));
    const missingSkills = jobSkills.filter(s => !candidateData.skills.includes(s));

    const resume = await Resume.create({
      candidate: candidate._id,
      job: job._id,
      uploadedBy: admin._id,
      originalName: `${candidateData.name.replace(' ', '_')}_Resume.pdf`,
      fileUrl: `/uploads/resumes/sample_${candidate._id}.pdf`,
      fileType: 'pdf',
      fileSize: Math.floor(Math.random() * 500000) + 100000,
      contentHash: require('crypto').createHash('sha256').update(candidateData.email).digest('hex'),
      rawText: `${candidateData.name} - ${candidateData.currentTitle} - ${candidateData.skills.join(', ')}`,
      extractedData: {
        name: candidateData.name,
        email: candidateData.email,
        phone: candidateData.phone,
        location: candidateData.location,
        skills: candidateData.skills,
        experience: [{ company: 'Previous Company', title: candidateData.currentTitle, duration: `${2024 - candidateData.totalExperienceYears} - Present`, years: candidateData.totalExperienceYears }],
        education: [{ institution: 'State University', degree: "Bachelor's", field: 'Computer Science', year: `${2024 - candidateData.totalExperienceYears - 4}` }],
        projects: [
          {
            name: `${candidateData.currentTitle} Platform`,
            description: `Built an enterprise solution using ${candidateData.skills.slice(0, 2).join(' and ')}. Implemented scalable architecture and automated CI/CD pipelines.`,
            technologies: candidateData.skills.slice(0, 3),
          },
          {
            name: 'Cloud Data Sync Engine',
            description: 'Designed a high-throughput data processing pipeline handling real-time analytics.',
            technologies: candidateData.skills.slice(2, 5),
          }
        ],
        certifications: ['AWS Certified Solutions Architect', 'Professional Scrum Master'],
        totalExperienceYears: candidateData.totalExperienceYears,
      },
      atsScore,
      matchScore,
      scoreBreakdown: {
        technicalSkills: Math.round(matchScore * 0.4),
        experience: Math.round(matchScore * 0.2),
        education: Math.round(matchScore * 0.15),
        jdSimilarity: Math.round(matchScore * 0.2),
        projects: 5,
        skillsMatch: Math.min(matchScore + 5, 100),
        experienceMatch: Math.max(matchScore - 5, 0),
        educationMatch: Math.max(matchScore - 8, 0),
        keywordsMatch: Math.min(matchScore + 3, 100),
      },
      skillComparison: jobSkills.map(s => ({
        skill: s,
        matched: candidateData.skills.includes(s)
      })),
      matchedSkills,
      missingSkills,
      whyShortlisted: `Strong ${matchedSkills.slice(0, 3).join(' + ')} experience`,
      aiSummary: `${candidateData.name} is a ${candidateData.currentTitle} with ${candidateData.totalExperienceYears} years of experience. Strong match for the ${job.title} role with ${matchedSkills.length} out of ${jobSkills.length} required skills. ${missingSkills.length > 0 ? `Missing: ${missingSkills.join(', ')}.` : 'All required skills present.'} Recommended for ${appStatus === 'shortlisted' || appStatus === 'interview' ? 'further evaluation' : 'initial screening'}.`,
      status: appStatus === 'applied' ? 'reviewed' : appStatus,
      isDuplicate: false,
    });

    await Candidate.findByIdAndUpdate(candidate._id, {
      $push: { resumes: resume._id },
      $set: { 'applications.0.resume': resume._id },
    });

    await Job.findByIdAndUpdate(job._id, { $inc: { applicantCount: 1 } });

    createdCandidates.push({ candidate, resume, job });
    console.log(`✅ Candidate: ${candidateData.name} (${matchScore}% match)`);
  }

  // Create Interviews for shortlisted/interview candidates
  const interviewCandidates = createdCandidates.filter(({ candidate }) =>
    candidate.applications[0].status === 'interview' || candidate.applications[0].status === 'shortlisted'
  );

  for (const { candidate, resume, job } of interviewCandidates) {
    const isPast = candidate.applications[0].status === 'interview';
    const scheduledAt = isPast
      ? new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      : new Date(Date.now() + Math.floor(Math.random() * 7 + 1) * 24 * 60 * 60 * 1000);

    const interview = await Interview.create({
      candidate: candidate._id,
      job: job._id,
      resume: resume._id,
      scheduledBy: admin._id,
      type: ['video', 'technical', 'phone'][Math.floor(Math.random() * 3)],
      round: 1,
      scheduledAt,
      duration: 60,
      meetingLink: 'https://meet.google.com/abc-defg-hij',
      status: isPast ? 'completed' : 'scheduled',
      ...(isPast && {
        feedback: {
          rating: 4,
          technicalScore: 82,
          communicationScore: 88,
          cultureFitScore: 85,
          notes: `${candidate.name} performed well in the technical round. Strong problem-solving skills demonstrated.`,
          recommendation: 'yes',
          submittedBy: admin._id,
          submittedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        },
      }),
    });
    console.log(`✅ Interview: ${candidate.name} - ${interview.status}`);
  }

  console.log('\n🎉 Seed complete!');
  console.log(`   ${createdJobs.length} Jobs`);
  console.log(`   ${CANDIDATES.length} Candidates`);
  console.log(`   ${CANDIDATES.length} Resumes`);
  console.log(`   ${interviewCandidates.length} Interviews`);
  await mongoose.disconnect();
}

seed().catch(err => { console.error(err); process.exit(1); });
