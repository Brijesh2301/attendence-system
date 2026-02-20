require('dotenv').config();
const express    = require('express');
const helmet     = require('helmet');
const cors       = require('cors');
const morgan     = require('morgan');
const rateLimit  = require('express-rate-limit');

const connectDB        = require('./config/db');
const authRoutes       = require('./routes/auth.routes');
const attendanceRoutes = require('./routes/attendance.routes');
const taskRoutes       = require('./routes/tasks.routes');
const { errorHandler, notFound } = require('./middleware/error.middleware');

const app  = express();
const PORT = process.env.PORT || 5000;
app.set('trust proxy', 1);

// Security 
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'"],
      styleSrc:   ["'self'", "'unsafe-inline'"],
      imgSrc:     ["'self'", 'data:', 'https:'],
    },
  },
}));

app.use(cors({
  origin:         process.env.CORS_ORIGIN || 'http://localhost:3000',
  methods:        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials:    true,
  maxAge:         86400,
}));

// Global rate limiter
app.use(rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max:      parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, message: 'Too many requests. Try again later.' },
}));

// Stricter limiter for auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many auth attempts. Try again in 15 minutes.' },
});

// ── General Middleware
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}


//  Health Check
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Attendance System API is running',
    database: 'MongoDB',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// Routes 
app.use('/api/auth',       authLimiter, authRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/tasks',      taskRoutes);

//  Error Handlers
app.use(notFound);
app.use(errorHandler);

// Start 
const startServer = async () => {
  await connectDB();                // Connect to MongoDB first
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 Server running on port ${PORT} [${process.env.NODE_ENV}]`);
    console.log(`🍃 Database: MongoDB`);
    console.log(`🔗 Health:   http://localhost:${PORT}/health`);
    console.log(`📡 API:      http://localhost:${PORT}/api\n`);
  });
};

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

module.exports = app;
