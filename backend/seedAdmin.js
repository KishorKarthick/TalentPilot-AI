require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: String,
  company: String,
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

async function seedAdmin() {
  await mongoose.connect(process.env.MONGO_URI);

  const existing = await User.findOne({ email: 'admin@talentpilot.ai' });
  if (existing) {
    console.log('Admin already exists:');
    console.log('  Email:    admin@talentpilot.ai');
    console.log('  Password: Admin@123');
    await mongoose.disconnect();
    return;
  }

  const hashed = await bcrypt.hash('Admin@123', 12);
  await User.create({
    name: 'Super Admin',
    email: 'admin@talentpilot.ai',
    password: hashed,
    role: 'admin',
    company: 'TalentPilot AI',
    isActive: true,
  });

  console.log('✅ Admin account created!');
  console.log('  Email:    admin@talentpilot.ai');
  console.log('  Password: Admin@123');
  console.log('  Role:     admin');
  await mongoose.disconnect();
}

seedAdmin().catch((err) => {
  console.error('Admin seeding failed:', err);
  process.exit(1);
});
