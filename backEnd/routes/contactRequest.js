const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');

const {
  submitContactForm,
  getAllRequests,
  updateRequestStatus,
  deleteRequest
} = require('../controllers/contactRequestController');

// --- User Route ---
// @route   POST /api/contact
router.post('/', protect, submitContactForm);


// --- Admin Routes ---
const admin = authorize('admin');

// @route   GET /api/contact/admin/all
router.get('/admin/all', protect, admin, getAllRequests);

// @route   PUT /api/contact/admin/:id
router.put('/admin/:id', protect, admin, updateRequestStatus);

// @route   DELETE /api/contact/admin/:id
router.delete('/admin/:id', protect, admin, deleteRequest);


module.exports = router;
