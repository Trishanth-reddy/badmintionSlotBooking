const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
// Import the new controller functions
const { initiateRegistration, register, login } = require('../controllers/authController');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 10, 
  message: { message: 'Too many attempts, please try again later.' }
});

// --- NEW ROUTES ---

// 1. Registration Flow (This is the one missing!)
router.post('/send-register-otp', authLimiter, initiateRegistration); 
router.post('/register', authLimiter, register);

// 2. Login Flow
router.post('/login', authLimiter, login);

module.exports = router;