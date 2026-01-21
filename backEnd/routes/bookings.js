const express = require('express');
const router = express.Router();
const { 
    createBooking, 
    getMySchedule, 
    getBookingAvailability,
    getOpenMatches, 
    requestToJoin,
    handleJoinRequest,
    getUpcomingBookings,
    cancelBooking,
    getBookingById,
    getMyBookings,
    markBookingPaid,
    getAllBookingsAdmin
} = require('../controllers/bookingController');
const { protect,authorize } = require('../middleware/auth');

// --- 1. Static Routes (Must be first) ---
router.get('/my-schedule', protect, getMySchedule); 
router.get('/availability', protect, getBookingAvailability);
router.get('/open-matches', protect, getOpenMatches);
router.get('/upcoming', protect, getUpcomingBookings);
router.get('/my-bookings', protect, getMyBookings);
router.get('/admin/all', protect, authorize('admin'), getAllBookingsAdmin);

// --- 2. Action Routes ---
router.post('/', protect, createBooking);
// --- 3. Dynamic Routes (Placed last to avoid CastErrors) ---
router.get('/:id', protect, getBookingById);
router.put('/:id/cancel', protect, cancelBooking); // <--- Cancellation Logic

// --- 4. Social & Admin ---
router.post('/:id/join', protect, requestToJoin);
router.put('/:id/requests/:requestId', protect, handleJoinRequest);
router.put('/:id/pay', protect, markBookingPaid);

module.exports = router;