const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');

// Import all required controller functions
const {
  getUserStats,
  getAllStats,
  getDashboardStats,  // <-- NEW
  getAnalyticsStats   // <-- NEW
} = require('../controllers/statsController');

// === User Route ===
router.get('/my-stats', protect, getUserStats);


// === Admin Routes ===
router.get('/admin/all', protect, authorize('admin'), getAllStats);

// NEW: Route for Admin Home Screen
router.get('/admin/dashboard', protect, authorize('admin'), getDashboardStats);

// NEW: Route for Analytics Screen
router.get('/admin/analytics', protect, authorize('admin'), getAnalyticsStats);


module.exports = router;