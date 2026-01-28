const mongoose = require('mongoose');
const asyncHandler = require('express-async-handler');
const Booking = require('../models/Booking');
const Court = require('../models/Court');
const User = require('../models/User');
const { 
  notifyCaptainJoinRequest, 
  notifyPlayerRequestAccepted, 
  notifyBookingApproved,
  notifyAdminNewBooking 
} = require('../services/notificationService');

// --- Helper: Quota Check (Enforces 1 Match per Day) ---
const isUserPlayingThatDay = async (userId, date, session = null) => {
    const bDate = new Date(date);
    bDate.setHours(0, 0, 0, 0);
    const query = Booking.findOne({
        date: bDate,
        bookingStatus: { $in: ['Pending', 'Confirmed'] },
        $or: [{ user: userId }, { 'teamMembers.userId': userId }]
    });
    return session ? query.session(session) : query;
};

// ===============================================
// --- CORE BOOKING LOGIC ---
// ===============================================

exports.createBooking = asyncHandler(async (req, res) => {
  const { courtId, dates, startTime, endTime, teamMemberIds = [], isPublic = false } = req.body;
  const captainId = req.user.id;

  // 1. DEDUPLICATE: Ensure we aren't checking the same person twice
  const allParticipantIds = [...new Set([captainId, ...teamMemberIds])];

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    for (const dateStr of dates) {
      const bDate = new Date(dateStr);
      bDate.setHours(0, 0, 0, 0);

      // 2. INDIVIDUAL VERIFICATION: Check EVERY player for conflicts on this specific day
      const conflict = await Booking.findOne({
        date: bDate,
        bookingStatus: { $in: ['Pending', 'Confirmed'] },
        $or: [
          { user: { $in: allParticipantIds } }, // Checked as Captain
          { 'teamMembers.userId': { $in: allParticipantIds } } // Checked as Team Member
        ]
      }).populate('user', 'fullName').session(session);

      if (conflict) {
        throw new Error(
          `Bulk Booking Failed: One or more players are already booked for a match on ${bDate.toLocaleDateString()}.`
        );
      }

      // 3. COURT AVAILABILITY: Ensure court isn't taken for this specific slot
      const courtBusy = await Booking.findOne({
        court: courtId,
        date: bDate,
        startTime,
        bookingStatus: { $in: ['Pending', 'Confirmed'] }
      }).session(session);

      if (courtBusy) {
        throw new Error(`Court is already taken for ${startTime} on ${bDate.toLocaleDateString()}`);
      }
    }

    // 4. BATCH EXECUTION: Create all bookings if all checks passed
    const bookingsToCreate = dates.map(d => ({
      bookingId: `BK-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
      court: courtId,
      date: new Date(d),
      startTime,
      endTime,
      user: captainId,
      isPublic, // Uses the flag from frontend (True = Blue, False = Red)
      teamMembers: allParticipantIds.map(id => ({ userId: id, paymentStatus: 'Pending' })),
      totalPlayers: allParticipantIds.length,
      bookingStatus: 'Pending'
    }));

    await Booking.insertMany(bookingsToCreate, { session });
    
    await session.commitTransaction();
    res.status(201).json({ success: true, message: "Bulk booking confirmed successfully!" });

  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
});

// ===============================================
// --- JOIN REQUESTS & MATCHMAKING ---
// ===============================================

// [UPDATED]: Added checks for Private vs Public and Max Players
exports.requestToJoin = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const booking = await Booking.findById(req.params.id); // Matches route /:id
    
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    // 1. Check Privacy (RED SLOT PROTECTION)
    if (!booking.isPublic) {
        return res.status(403).json({ message: "This match is Private. You cannot join." });
    }

    // 2. Check Capacity (FULL SLOT PROTECTION)
    if (booking.totalPlayers >= booking.maxPlayers) { // Assuming maxPlayers is 6 in model
         return res.status(400).json({ message: "This match is already full." });
    }

    // 3. Dynamic Membership Check
    const user = await User.findById(userId);
    const now = new Date();
    const expiryDate = user.membership?.expiryDate ? new Date(user.membership.expiryDate) : null;

    if (!expiryDate || expiryDate < now) {
        return res.status(403).json({ 
            success: false, 
            message: "Membership Required: Your membership has expired or is inactive." 
        });
    }

    // 4. Daily Quota Check
    if (await isUserPlayingThatDay(userId, booking.date)) {
        return res.status(400).json({ message: "You already have a match scheduled for this day." });
    }

    // 5. Duplicate Request Check
    if (booking.joinRequests.some(r => r.user.toString() === userId)) {
        return res.status(400).json({ message: 'Request already sent.' });
    }

    // 6. Execute Request
    booking.joinRequests.push({ user: userId, status: 'Pending' });
    await booking.save();

    // Notify Captain
    const court = await Court.findById(booking.court);
    await notifyCaptainJoinRequest(booking.user, req.user.fullName, court.name, booking._id);

    res.status(200).json({ success: true, message: 'Join request sent!' });
});

exports.handleJoinRequest = asyncHandler(async (req, res) => {
    const { status } = req.body;
    const booking = await Booking.findById(req.params.id);
    if (booking.user.toString() !== req.user.id) return res.status(403).json({ message: 'Not authorized' });

    const request = booking.joinRequests.id(req.params.requestId);
    if (!request) return res.status(404).json({ message: 'Request not found' });

    if (status === 'Accepted') {
        if (booking.teamMembers.length >= 6) return res.status(400).json({ message: 'Court is full.' });
        
        if (await isUserPlayingThatDay(request.user, booking.date)) {
            request.status = 'Declined';
            await booking.save();
            return res.status(400).json({ message: 'This player joined another match today.' });
        }

        booking.teamMembers.push({ userId: request.user });
        booking.totalPlayers = booking.teamMembers.length;

        // Notify Player
        const court = await Court.findById(booking.court);
        await notifyPlayerRequestAccepted(request.user, court.name);
    }

    request.status = status;
    await booking.save();
    res.status(200).json({ success: true, data: booking });
});

// ===============================================
// --- NEW: TIME SLOT GRID LOGIC ---
// ===============================================

/**
 * @desc    Get All Slots with RED/GREEN/BLUE status for the Grid UI
 * @route   GET /api/bookings/slots?courtId=X&date=Y
 */
exports.getSlotsForDate = asyncHandler(async (req, res) => {
    const { courtId, date } = req.query; 

    // 1. Operating Hours
    const allTimeSlots = [
      "06:00 AM", "07:00 AM", "08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM",
      "12:00 PM", "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM",
      "06:00 PM", "07:00 PM", "08:00 PM", "09:00 PM", "10:00 PM"
    ];

    // 2. Set Time Range (Start of Day to End of Day)
    const queryDate = new Date(date);
    const startOfDay = new Date(queryDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(queryDate.setHours(23, 59, 59, 999));

    // 3. Find Bookings
    const bookings = await Booking.find({
      court: courtId,
      date: { $gte: startOfDay, $lte: endOfDay },
      bookingStatus: { $in: ['Pending', 'Confirmed'] } // Ignore cancelled
    })
    .populate('user', 'fullName') // Get Captain Name
    .lean();

    // 4. Map Bookings for Fast Lookup
    const bookingMap = {};
    bookings.forEach(b => {
      bookingMap[b.startTime] = b;
    });

    // 5. Build Response Data (The logic for Red/Green/Blue)
    const slotData = allTimeSlots.map(time => {
      const match = bookingMap[time];

      if (match) {
        // BOOKED SLOT (Red or Blue)
        return {
          time: time,
          isBooked: true,
          bookingId: match._id,
          isPrivate: !match.isPublic, // Frontend expects isPrivate for Red logic
          bookedBy: match.user ? match.user.fullName : "Unknown",
          currentPlayers: match.totalPlayers,
          maxPlayers: match.maxPlayers || 6
        };
      } else {
        // AVAILABLE SLOT (Green)
        return {
          time: time,
          isBooked: false,
          isPrivate: false,
          currentPlayers: 0
        };
      }
    });

    res.status(200).json({ success: true, data: slotData });
});


// ===============================================
// --- UTILITY GETTERS (Legacy & Admin) ---
// ===============================================

exports.getBookingAvailability = asyncHandler(async (req, res) => {
    const { courtId, dates } = req.query;
    if (!dates) return res.status(400).json({ message: "Dates required" });
    const dateArray = dates.split(',').map(d => new Date(d));
    const bookings = await Booking.find({
        court: courtId,
        date: { $in: dateArray },
        bookingStatus: { $in: ['Pending', 'Confirmed'] }
    }).select('startTime');
    const bookedSlots = [...new Set(bookings.map(b => b.startTime))];
    res.status(200).json({ success: true, data: bookedSlots });
});

exports.getMySchedule = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const bookings = await Booking.find({
        $or: [{ user: userId }, { 'teamMembers.userId': userId }],
        bookingStatus: { $ne: 'Cancelled' }
    }).select('date');
    const occupiedDates = [...new Set(bookings.map(b => b.date.toISOString().split('T')[0]))];
    res.status(200).json({ success: true, data: occupiedDates });
});

exports.getMyBookings = asyncHandler(async (req, res) => {
    const data = await Booking.find({ 
        $or: [{ user: req.user.id }, { 'teamMembers.userId': req.user.id }] 
    }).populate('court', 'name').sort({ date: -1 });
    res.status(200).json({ success: true, data });
});

exports.getUpcomingBookings = asyncHandler(async (req, res) => {
    const data = await Booking.find({
        date: { $gte: new Date().setHours(0,0,0,0) },
        $or: [{ user: req.user.id }, { 'teamMembers.userId': req.user.id }]
    }).populate('court', 'name');
    res.status(200).json({ success: true, data });
});

exports.getBookingById = asyncHandler(async (req, res) => {
    const booking = await Booking.findById(req.params.id)
        .populate('court user') 
        .populate('teamMembers.userId', 'fullName profilePicture') 
        .populate('joinRequests.user', 'fullName phone'); 

    if (!booking) return res.status(404).json({ message: "Booking not found" });
    res.status(200).json({ success: true, data: booking });
});

exports.getOpenMatches = asyncHandler(async (req, res) => {
    const data = await Booking.find({ isPublic: true, bookingStatus: 'Pending' })
        .populate('court', 'name').populate('user', 'fullName');
    res.status(200).json({ success: true, data });
});

exports.cancelBooking = asyncHandler(async (req, res) => {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Match not found" });

    if (booking.user.toString() !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ message: "Not authorized to cancel this match." });
    }

    booking.bookingStatus = 'Cancelled';
    
    if (req.user.role === 'admin') {
        booking.adminNote = "Cancelled by Admin Override";
    }

    await booking.save();
    
    const { notifyUserBookingStatus } = require('../services/notificationService');
    await notifyUserBookingStatus(booking, 'Cancelled');

    res.status(200).json({ success: true, message: "Booking cancelled successfully." });
});

exports.markBookingPaid = asyncHandler(async (req, res) => {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    booking.bookingStatus = 'Confirmed';
    await booking.save();

    await notifyBookingApproved(booking);

    res.status(200).json({ success: true, message: 'Booking confirmed and parties notified.' });
});

exports.getAllBookingsAdmin = asyncHandler(async (req, res) => {
    const { status, date } = req.query;
    let query = {};

    if (status) query.bookingStatus = status;
    if (date) {
        const queryDate = new Date(date);
        queryDate.setHours(0,0,0,0);
        query.date = queryDate;
    }

    const bookings = await Booking.find(query)
        .populate('court', 'name')
        .populate('user', 'fullName phone email') 
        .populate('teamMembers.userId', 'fullName') 
        .sort({ date: -1 });

    res.status(200).json({ success: true, count: bookings.length, data: bookings });
});