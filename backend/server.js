require('dotenv').config();
require('express-async-errors');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Connect Database
connectDB();

// Security Middleware
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rate Limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use('/api/', limiter);

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/jobs', require('./routes/jobs'));
app.use('/api/resumes', require('./routes/resumes'));
app.use('/api/candidates', require('./routes/candidates'));
app.use('/api/interviews', require('./routes/interviews'));
app.use('/api/analytics', require('./routes/analytics'));

// Health Check
app.get('/health', (req, res) => res.json({ status: 'OK', timestamp: new Date() }));

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.originalUrl} not found` });
});

// Global Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

const shutdownOnFatal = (label) => (err) => {
  console.error(`${label}:`, err);
  server.close(() => process.exit(1));
  // Force exit if the server does not close in time
  setTimeout(() => process.exit(1), 10000).unref();
};

process.on('unhandledRejection', shutdownOnFatal('Unhandled promise rejection'));
process.on('uncaughtException', shutdownOnFatal('Uncaught exception'));
