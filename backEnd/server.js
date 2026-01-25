const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet'); // SECURITY
const compression = require('compression'); // SPEED
const rateLimit = require('express-rate-limit'); // ANTI-SPAM
require('dotenv').config();

// --- Import Routes ---
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const courtRoutes = require('./routes/courts');
const bookingRoutes = require('./routes/bookings');
const statsRoutes = require('./routes/stats');
const contactRoutes = require('./routes/contactRequest');
const { scheduleExpiryNotifications } = require('./services/notificationScheduler');

const app = express();

// ==========================================
// 1. SECURITY & PERFORMANCE MIDDLEWARE
// ==========================================

// Set Security Headers (Prevents XSS, Sniffing, etc.)
app.use(helmet());

// Compress responses (Makes API faster)
app.use(compression());

// Rate Limiting (Limits each IP to 100 requests per 15 minutes)
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 100000, 
//   message: 'Too many requests from this IP, please try again after 15 minutes',
//   standardHeaders: true, 
//   legacyHeaders: false,
// });
// app.use('/api', limiter); // Apply to all API routes

// Standard Middleware
app.use(cors()); // In production, you might restrict this to your app's domain
app.use(express.json()); // Built-in body parser
app.use(express.urlencoded({ extended: true }));

// ==========================================
// 2. DATABASE CONNECTION
// ==========================================
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error);
    process.exit(1);
  }
};

// Start DB and Scheduler
connectDB();
scheduleExpiryNotifications();

// ==========================================
// 3. ROUTES
// ==========================================
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/courts', courtRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/contact', contactRoutes);

// Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', uptime: process.uptime() });
});

// ==========================================
// 4. GLOBAL ERROR HANDLING (Prevent Crashes)
// ==========================================
app.use((err, req, res, next) => {
  console.error('🔥 Server Error:', err.stack);
  
  // Don't leak stack traces to the client in production
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});