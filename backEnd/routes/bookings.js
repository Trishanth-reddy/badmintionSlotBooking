const express = require('express');
const router = express.Router();
const { 
    createBooking, 
    getMySchedule, 
    getBookingAvailability,
    getSlotsForDate, // <--- NEW IMPORT
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
const { protect, authorize } = require('../middleware/auth');

// --- 1. Static Routes (Must be first to avoid ID conflicts) ---
router.get('/my-schedule', protect, getMySchedule); 
router.get('/availability', protect, getBookingAvailability); // Legacy check
router.get('/slots', protect, getSlotsForDate); // <--- NEW: Red/Green/Blue Logic
router.get('/open-matches', protect, getOpenMatches);
router.get('/upcoming', protect, getUpcomingBookings);
router.get('/my-bookings', protect, getMyBookings);
router.get('/admin/all', protect, authorize('admin'), getAllBookingsAdmin);

// --- 2. Action Routes ---
router.post('/', protect, createBooking);

// --- 3. Social & Admin Actions (Specific Booking IDs) ---
router.post('/:id/join', protect, requestToJoin);
router.put('/:id/requests/:requestId', protect, handleJoinRequest);
router.put('/:id/pay', protect, markBookingPaid);
router.put('/:id/cancel', protect, cancelBooking); 

// --- 4. Dynamic Routes (Must be LAST) ---
// If you put this higher, it will catch "slots" as an ID
router.get('/:id', protect, getBookingById);

module.exports = router;