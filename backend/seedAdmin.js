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
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password || password.length < 12) {
    console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD (min 12 characters) before seeding the admin account.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);

  const existing = await User.findOne({ email });
  if (existing) {
    console.log(`Admin already exists: ${email}`);
    await mongoose.disconnect();
    return;
  }

  const hashed = await bcrypt.hash(password, 12);
  await User.create({
    name: 'Super Admin',
    email,
    password: hashed,
    role: 'admin',
    company: 'TalentPilot AI',
    isActive: true,
  });

  console.log('✅ Admin account created!');
  console.log(`  Email: ${email}`);
  console.log('  Role:  admin');
  await mongoose.disconnect();
}

seedAdmin().catch(console.error);
