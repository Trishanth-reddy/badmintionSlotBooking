const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { register, login, getProfile, updateProfile, changePassword, logout, deleteAccount } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// Import the NEW validators
const { validateRegister, validateLogin } = require('../middleware/validation'); 

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 10, 
  message: { message: 'Too many login attempts, please try again later.' }
});

// Public routes (With Validation Middleware)
router.post('/register', authLimiter, validateRegister, register); // <--- Uses validateRegister
router.post('/login', authLimiter, validateLogin, login);       // <--- Uses validateLogin

// Protected routes
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.put('/change-password', protect, changePassword);
router.post('/logout', protect, logout);
router.delete('/account', protect, deleteAccount);

module.exports = router;