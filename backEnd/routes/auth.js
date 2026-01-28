const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
// Import the new controller functions
const { initiateRegistration, register, login, updatePassword } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
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
router.put('/updatepassword', protect, updatePassword);


module.exports = router;