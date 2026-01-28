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
const adminRoutes = require('./routes/adminRoutes');
const { scheduleExpiryNotifications } = require('./services/notificationScheduler');

const app = express();

// ==========================================
// 1. DEV CONFIGURATION (CRITICAL FIX)
// ==========================================

// ✅ Fix for Ngrok/Tunneling issues
// This prevents the "ERR_ERL_UNEXPECTED_X_FORWARDED_FOR" crash
app.set('trust proxy', 1);

// ==========================================
// 2. SECURITY & PERFORMANCE MIDDLEWARE
// ==========================================

// Set Security Headers
app.use(helmet());

// Compress responses
app.use(compression());

// Rate Limiting (Relaxed for Development)
// Kept high so you don't get blocked while testing
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit to 1000 requests (plenty for dev)
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true, 
  legacyHeaders: false,
});
app.use('/api', limiter); 

// Standard Middleware
app.use(cors()); 
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

// ==========================================
// 3. DATABASE CONNECTION
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
// 4. ROUTES
// ==========================================
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/courts', courtRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/admin', adminRoutes); // <--- ADD THIS
// Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', uptime: process.uptime() });
});

// ==========================================
// 5. GLOBAL ERROR HANDLING
// ==========================================
app.use((err, req, res, next) => {
  console.error('🔥 Server Error:', err.stack);
  
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    message: err.message,
    // Show full stack trace in development mode for easier debugging
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});