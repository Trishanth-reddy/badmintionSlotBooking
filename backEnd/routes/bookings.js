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
// --- USER ROUTES ---
// ===============================================

router.post('/', protect, bookingLimiter, createBooking);
router.get('/my-bookings', protect, getMyBookings);
router.get('/upcoming', protect, getUpcomingBookings);
router.get('/availability', protect, getBookingAvailability);
router.get('/:id', protect, getBookingById);
router.delete('/:id', protect, cancelBooking);

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