const mongoose = require('mongoose');
const asyncHandler = require('express-async-handler');

// Models
const Booking = require('../models/Booking');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const Court = require('../models/Court');

// Services
const { notifyAdminNewBooking, notifyUserBookingStatus } = require('../services/notificationService');

// --- Helpers ---
const generateBookingId = () =>
  `BK-${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

const isValidObjectId = (id) =>
  mongoose.Types.ObjectId.isValid(id) && /^[0-9a-fA-F]{24}$/.test(id);

// ===============================================
// --- CORE BOOKING LOGIC ---
// ===============================================

/**
 * @desc    Create Bulk/Single Booking (Atomic Transaction)
 * @route   POST /api/bookings
 * @access  Private
 */
exports.createBooking = asyncHandler(async (req, res) => {
  const { courtId, dates, startTime, endTime, teamMemberIds = [] } = req.body;
  const captainUserId = req.user.id;

  if (!courtId || !dates?.length || !startTime || !endTime)
    return res.status(400).json({ message: 'Court, Dates, and Time are required' });

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const court = await Court.findById(courtId).session(session);
    if (!court) throw new Error('Court not found');

    const validMemberIds = teamMemberIds.filter(isValidObjectId);
    const allPlayerIds = [captainUserId, ...validMemberIds];
    
    if (allPlayerIds.length < 1 || allPlayerIds.length > 6)
      throw new Error('Team must be between 1 and 6 players');

    const activeSubs = await Subscription.find({
      user: { $in: allPlayerIds },
      status: 'Active',
    }).session(session);

    if (!activeSubs.some(sub => String(sub.user) === String(captainUserId)))
      throw new Error('Captain must have an active membership');

    const teamInfos = await User.find({ _id: { $in: allPlayerIds } })
      .select('fullName phone')
      .session(session);

    const teamArr = allPlayerIds.map((id) => {
      const member = teamInfos.find((m) => String(m._id) === String(id));
      return {
        userId: id,
        memberName: member?.fullName ?? 'Unknown',
        memberPhone: member?.phone ?? '',
        paymentStatus: 'Pending',
      };
    });

    const bookingsToCreate = [];
    for (const dateStr of dates) {
      const bookingDate = new Date(dateStr);
      bookingDate.setHours(0, 0, 0, 0);

      const searchDateStart = new Date(dateStr);
      searchDateStart.setHours(0, 0, 0, 0);
      const searchDateEnd = new Date(dateStr);
      searchDateEnd.setHours(23, 59, 59, 999);

      const slot = await Booking.findOne({
        court: courtId,
        date: { $gte: searchDateStart, $lte: searchDateEnd },
        startTime: { $lt: endTime },
        endTime: { $gt: startTime },
        bookingStatus: { $in: ['Pending', 'Confirmed'] },
      }).session(session);

      if (slot) throw new Error(`${dateStr}: Slot ${startTime}-${endTime} is already booked.`);

      const daily = await Booking.findOne({
        date: { $gte: searchDateStart, $lte: searchDateEnd },
        'teamMembers.userId': { $in: allPlayerIds },
        bookingStatus: { $in: ['Pending', 'Confirmed'] },
      }).session(session);

      if (daily) throw new Error(`${dateStr}: A team member already has a booking on this day.`);

      bookingsToCreate.push({
        bookingId: generateBookingId(),
        court: courtId,
        date: bookingDate,
        startTime,
        endTime,
        user: captainUserId,
        teamMembers: teamArr,
        totalPlayers: allPlayerIds.length,
        bookingStatus: 'Pending',
        totalAmount: 0,
      });
    }

    const createdBookings = await Booking.insertMany(bookingsToCreate, { session });
    await session.commitTransaction();
    session.endSession();

    if (createdBookings.length) {
      notifyAdminNewBooking(createdBookings[0]);
      notifyUserBookingStatus(createdBookings[0], 'Pending');
    }

    res.status(201).json({ success: true, count: createdBookings.length, data: createdBookings });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({ success: false, message: error.message });
  }
});

// ===============================================
// --- JOIN REQUEST LOGIC ---
// ===============================================

/**
 * @desc    Request to join an existing booking
 * @route   POST /api/bookings/:id/join
 */
exports.requestToJoin = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  const userId = req.user.id;

  if (!booking) return res.status(404).json({ message: 'Booking not found' });

  if (booking.user.toString() === userId) {
    return res.status(400).json({ message: 'You are the captain of this booking' });
  }

  const isAlreadyMember = booking.teamMembers.some(m => m.userId.toString() === userId);
  if (isAlreadyMember) {
    return res.status(400).json({ message: 'You are already a member of this team' });
  }

  if (booking.teamMembers.length >= 6) {
    return res.status(400).json({ message: 'This booking is already full' });
  }

  const existingRequest = booking.joinRequests.find(r => r.user.toString() === userId);
  if (existingRequest && existingRequest.status !== 'Declined') {
    return res.status(400).json({ message: 'You already have a active request' });
  }

  if (existingRequest && existingRequest.status === 'Declined') {
    existingRequest.status = 'Pending';
    existingRequest.requestedAt = new Date();
  } else {
    booking.joinRequests.push({ user: userId, status: 'Pending' });
  }

  await booking.save();
  res.status(200).json({ success: true, message: 'Join request sent' });
});

/**
 * @desc    Accept or Decline a join request (Captain only)
 * @route   PUT /api/bookings/:id/request/:requestId
 */
exports.handleJoinRequest = asyncHandler(async (req, res) => {
  const { status } = req.body; // 'Accepted' or 'Declined'
  const booking = await Booking.findById(req.params.id);

  if (!booking) return res.status(404).json({ message: 'Booking not found' });

  if (booking.user.toString() !== req.user.id) {
    return res.status(403).json({ message: 'Only the captain can manage requests' });
  }

  const request = booking.joinRequests.id(req.params.requestId);
  if (!request) return res.status(404).json({ message: 'Request not found' });

  if (status === 'Accepted') {
    if (booking.teamMembers.length >= 6) {
      return res.status(400).json({ message: 'Team is full.' });
    }

    const joiningUser = await User.findById(request.user).select('fullName phone');
    
    booking.teamMembers.push({
      userId: joiningUser._id,
      memberName: joiningUser.fullName,
      memberPhone: joiningUser.phone,
      paymentStatus: 'Pending'
    });
    
    booking.totalPlayers = booking.teamMembers.length;
    request.status = 'Accepted';
  } else {
    request.status = 'Declined';
  }

  await booking.save();
  res.status(200).json({ success: true, message: `Request ${status}`, data: booking });
});

// ===============================================
// --- READ & AVAILABILITY ---
// ===============================================

exports.getBookingAvailability = asyncHandler(async (req, res) => {
  const { courtId, dates } = req.query;
  if (!courtId || !dates) return res.status(400).json({ message: 'Required fields missing' });

  const dateArray = dates.split(',');
  const startDates = dateArray.map(d => new Date(d).setHours(0,0,0,0));
  
  const minDate = new Date(Math.min(...startDates));
  const maxDate = new Date(Math.max(...startDates));
  maxDate.setHours(23, 59, 59, 999);

  const bookings = await Booking.find({
    court: courtId,
    date: { $gte: minDate, $lte: maxDate },
    bookingStatus: { $in: ['Pending', 'Confirmed'] },
  }).select('date startTime endTime');

  const bookedSlotsSet = new Set();
  bookings.forEach((b) => {
    bookedSlotsSet.add(`${b.date.toISOString().split('T')[0]}_${b.startTime}`);
  });

  res.status(200).json({ success: true, data: Array.from(bookedSlotsSet) });
});

exports.getMyBookings = asyncHandler(async (req, res) => {
  const bookings = await Booking.find({ user: req.user.id })
    .populate('court', 'name')
    .sort({ date: -1 })
    .lean();
  res.status(200).json({ success: true, data: bookings });
});

exports.getBookingById = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .populate('court', 'name pricePerHour')
    .populate('user', 'fullName email phone')
    .populate('joinRequests.user', 'fullName phone');
  if (!booking) return res.status(404).json({ message: 'Not found' });
  res.status(200).json({ success: true, data: booking });
});

// ===============================================
// --- ADMIN & STATUS MANAGEMENT ---
// ===============================================

exports.cancelBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking || booking.user.toString() !== req.user.id)
    return res.status(403).json({ message: 'Unauthorized' });

  booking.bookingStatus = 'Cancelled';
  booking.cancelledAt = new Date();
  await booking.save();
  res.status(200).json({ success: true, message: 'Cancelled' });
});

exports.markBookingPaid = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id).populate('court');
  if (!booking) return res.status(404).json({ message: 'Not found' });

  booking.bookingStatus = 'Confirmed';
  booking.totalAmount = booking.court.pricePerHour || 0;
  booking.teamMembers.forEach((m) => (m.paymentStatus = 'Paid'));
  booking.paidAt = new Date();

  await booking.save();
  notifyUserBookingStatus(booking, 'Confirmed');
  res.status(200).json({ success: true, data: booking });
});

exports.getAllBookings = asyncHandler(async (req, res) => {
  const { date, status } = req.query;
  const query = {};
  if (date) query.date = new Date(date);
  if (status && status !== 'all') query.bookingStatus = status;

  const bookings = await Booking.find(query)
    .populate('user', 'fullName')
    .populate('court', 'name')
    .sort({ createdAt: -1 });

  res.status(200).json({ success: true, data: bookings });
});