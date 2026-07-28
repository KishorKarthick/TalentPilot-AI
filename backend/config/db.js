const mongoose = require('mongoose');

const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is not set — cannot start the server');
    process.exit(1);
  }

  // Connection errors after the initial handshake are emitted here rather than thrown.
  mongoose.connection.on('error', (err) => console.error(`MongoDB Error: ${err.message}`));
  mongoose.connection.on('disconnected', () => console.warn('MongoDB disconnected'));

  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection failed: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
