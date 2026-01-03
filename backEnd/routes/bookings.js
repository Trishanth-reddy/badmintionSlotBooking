const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { protect, authorize } = require('../middleware/auth');

const {
  createBooking,
  getMyBookings,
  getUpcomingBookings,
  getBookingById,
  cancelBooking,
  getBookingAvailability,
  // Join Request Controllers
  requestToJoin,
  handleJoinRequest,
  // Admin Controllers
  getAllBookings,
  getBookingsToday,
  markBookingPaid,
  markMemberPayment,
  adminCancelBooking
} = require('../controllers/bookingController');

// --- Security: Limit Booking Creation ---
const bookingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Max 20 booking attempts per hour
  message: { message: 'Booking limit reached. Please wait.' }
});

// ===============================================
// --- USER ROUTES (Standard) ---
// ===============================================

router.post('/', protect, bookingLimiter, createBooking);
router.get('/my-bookings', protect, getMyBookings);
router.get('/upcoming', protect, getUpcomingBookings);
router.get('/availability', protect, getBookingAvailability);
router.get('/:id', protect, getBookingById);
router.delete('/:id', protect, cancelBooking);

// ===============================================
// --- JOIN REQUEST ROUTES ---
// ===============================================

/**
 * @route   POST /api/bookings/:id/join
 * @desc    A guest requests to join a booking
 */
router.post('/:id/join', protect, requestToJoin);

/**
 * @route   PUT /api/bookings/:id/request/:requestId
 * @desc    The Captain accepts or declines a specific join request
 */
router.put('/:id/request/:requestId', protect, handleJoinRequest);

// ===============================================
// --- ADMIN ROUTES ---
// ===============================================
const admin = authorize('admin');

router.get('/admin/all', protect, admin, getAllBookings);
router.get('/admin/today', protect, admin, getBookingsToday);
router.put('/admin/:id/pay-all', protect, admin, markBookingPaid);
router.put('/admin/:id/member/:userId/pay', protect, admin, markMemberPayment);
router.delete('/admin/:id', protect, admin, adminCancelBooking);

module.exports = router;