const express = require('express');
const router = express.Router();
const {
  searchUsers,
  getUserSubscription,
  addSubscription,
  cancelSubscription,
  getAllSubscriptions,
  // --- NEW ---
  getAllPlans,
  purchaseSubscription,
  getMySubscription
} = require('../controllers/subscriptionController');
const { protect, authorize } = require('../middleware/auth');

// ===============================================
// --- NEW USER ROUTES ---
// ===============================================

// @route   GET /api/subscriptions/plans
router.get('/plans', protect, getAllPlans);

// @route   POST /api/subscriptions/purchase
router.post('/purchase', protect, purchaseSubscription);

// @route   GET /api/subscriptions/my-subscription
router.get('/my-subscription', protect, getMySubscription);


// ===============================================
// --- ADMIN ROUTES ---
// ===============================================
const admin = authorize('admin');

router.get('/admin/users/search', protect, admin, searchUsers);
router.get('/admin/subscription/:userId', protect, admin, getUserSubscription);
router.post('/admin/subscription/add', protect, admin, addSubscription);
router.delete('/admin/subscription/:userId', protect, admin, cancelSubscription);
router.get('/admin/subscriptions', protect, admin, getAllSubscriptions);

module.exports = router;
