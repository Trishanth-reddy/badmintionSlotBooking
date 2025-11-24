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

  // Validation
  if (!courtId || !dates?.length || !startTime || !endTime)
    return res.status(400).json({ message: 'Court, Dates, and Time are required' });

  // Start transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Validate Court
    const court = await Court.findById(courtId).session(session);
    if (!court) throw new Error('Court not found');

    // Validate Team Size
    const validMemberIds = teamMemberIds.filter(isValidObjectId);
    const allPlayerIds = [captainUserId, ...validMemberIds];
    if (allPlayerIds.length < 2 || allPlayerIds.length > 6)
      throw new Error('Team must be between 2 and 6 players');

    // Validate Membership (Must be Active)
    const activeSubs = await Subscription.find({
      user: { $in: allPlayerIds },
      status: 'Active',
    })
      .select('user expiryDate')
      .session(session);
    if (activeSubs.length === 0)
      throw new Error('Captain must have an active membership');

    // Find earliest expiry
    let minExpiry = activeSubs[0].expiryDate;
    for (const sub of activeSubs) if (sub.expiryDate < minExpiry) minExpiry = sub.expiryDate;

    // Prepare Team Member Data
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

    // Process Each Date
    const bookingsToCreate = [];
    for (const dateStr of dates) {
      const bookingDate = new Date(dateStr);
      bookingDate.setHours(0, 0, 0, 0);

      // Check expiry
      if (bookingDate >= minExpiry)
        throw new Error(`${dateStr}: Date exceeds membership expiry of a team member.`);

      // Slot search range for that day
      const searchDateStart = new Date(dateStr);
      searchDateStart.setHours(0, 0, 0, 0);
      const searchDateEnd = new Date(dateStr);
      searchDateEnd.setHours(23, 59, 59, 999);

      // Check slot availability
      const slot = await Booking.findOne({
        court: courtId,
        date: { $gte: searchDateStart, $lte: searchDateEnd },
        startTime: { $lt: endTime },
        endTime: { $gt: startTime },
        bookingStatus: { $in: ['Pending', 'Confirmed'] },
      }).session(session);

      if (slot) throw new Error(`${dateStr}: Slot ${startTime}-${endTime} is already booked.`);

      // Check daily limit for each player
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

    // Execute insert
    const createdBookings = await Booking.insertMany(bookingsToCreate, { session });

    // Commit
    await session.commitTransaction();
    session.endSession();

    // Notify admin & user
    if (createdBookings.length) {
      notifyAdminNewBooking(createdBookings[0]);
      notifyUserBookingStatus(createdBookings[0], 'Pending');
    }

    res.status(201).json({
      success: true,
      message: `Successfully booked ${createdBookings.length} day(s).`,
      data: createdBookings,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({
      success: false,
      message: error.message || 'Booking failed',
    });
  }
});

// ===============================================
// --- READ & AVAILABILITY ---
// ===============================================

/**
 * @desc    Get availability across multiple dates for a court
 * @route   GET /api/bookings/availability
 */
exports.getBookingAvailability = asyncHandler(async (req, res) => {
  const { courtId, dates } = req.query;
  if (!courtId || !dates)
    return res.status(400).json({ message: 'Court ID and Dates are required' });

  const dateArray = dates.split(',');
  const startDates = dateArray.map((d) => {
    const dt = new Date(d);
    dt.setHours(0, 0, 0, 0);
    return dt;
  });
  const minDate = new Date(Math.min(...startDates));
  const maxDate = new Date(Math.max(...startDates));
  maxDate.setHours(23, 59, 59, 999);

  // Get relevant bookings only (projection!)
  const bookings = await Booking.find({
    court: courtId,
    date: { $gte: minDate, $lte: maxDate },
    bookingStatus: { $in: ['Pending', 'Confirmed'] },
  }).select('date startTime endTime');

  // Find blocked slots
  const bookedSlotsSet = new Set();
  bookings.forEach((b) => {
    const bDate = b.date.toISOString().split('T')[0];
    if (dateArray.includes(bDate) && b.startTime && b.endTime) {
      const startHour = parseInt(b.startTime.split(':')[0]);
      const endHour = parseInt(b.endTime.split(':')[0]);
      const startIsPM = b.startTime.includes('PM');
      const endIsPM = b.endTime.includes('PM');
      const start24 = (startHour === 12 && !startIsPM) ? 0 : (startIsPM && startHour !== 12) ? startHour + 12 : startHour;
      const end24 = (endHour === 12 && !endIsPM) ? 24 : (endIsPM && endHour !== 12) ? endHour + 12 : endHour;
      for (let i = start24; i < end24; i++) {
        const hour = i % 12 === 0 ? 12 : i % 12;
        const suffix = (i < 12 || i === 24) ? 'AM' : 'PM';
        bookedSlotsSet.add(`${hour}:00 ${suffix}`);
      }
    }
  });

  res.status(200).json({
    success: true,
    data: Array.from(bookedSlotsSet),
  });
});

// Get own bookings (lean used for perf, only what's needed)
exports.getMyBookings = asyncHandler(async (req, res) => {
  const bookings = await Booking.find({ user: req.user.id })
    .populate('court', 'name')
    .sort({ date: -1, startTime: -1 })
    .lean();
  res.status(200).json({ success: true, count: bookings.length, data: bookings });
});

// Upcoming bookings for user
exports.getUpcomingBookings = asyncHandler(async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const bookings = await Booking.find({
    user: req.user.id,
    date: { $gte: today },
    bookingStatus: { $in: ['Confirmed', 'Pending'] },
  })
    .populate('court', 'name')
    .sort({ date: 1, startTime: 1 });
  res.status(200).json({ success: true, count: bookings.length, data: bookings });
});

// Specific booking details
exports.getBookingById = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .populate('court', 'name pricePerHour')
    .populate('user', 'fullName email phone');
  if (!booking) return res.status(404).json({ message: 'Booking not found' });
  res.status(200).json({ success: true, data: booking });
});

// ===============================================
// --- CANCELLATION & ADMIN ---
// ===============================================

exports.cancelBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) return res.status(404).json({ message: 'Booking not found' });

  // Ownership
  if (booking.user.toString() !== req.user.id)
    return res.status(403).json({ message: 'Not authorized to cancel this booking' });

  booking.bookingStatus = 'Cancelled';
  booking.cancellationReason = req.body.cancellationReason || 'User cancelled';
  booking.cancelledAt = new Date();
  await booking.save();

  res.status(200).json({ success: true, message: 'Booking cancelled', data: booking });
});

exports.getAllBookings = asyncHandler(async (req, res) => {
  const { date, status, search } = req.query;
  const query = {};

  // Date filter
  if (date) {
    const searchDate = new Date(date);
    searchDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(searchDate);
    nextDay.setDate(searchDate.getDate() + 1);
    query.date = { $gte: searchDate, $lt: nextDay };
  }

  // Status filter
  if (status && status !== 'all' && status !== 'today') {
    query.bookingStatus = status;
  }

  // Text search (Booking ID or User Name)
  if (search) {
    const users = await User.find({ fullName: { $regex: search, $options: 'i' } }).select('_id');
    query.$or = [
      { bookingId: { $regex: search, $options: 'i' } },
      { user: { $in: users.map((u) => u._id) } },
    ];
  }

  const bookings = await Booking.find(query)
    .populate('user', 'fullName email phone')
    .populate('court', 'name pricePerHour')
    .sort({ date: -1, startTime: 1 });

  res.status(200).json({ success: true, count: bookings.length, data: bookings });
});

exports.getBookingsToday = asyncHandler(async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const bookings = await Booking.find({ date: { $gte: today, $lt: tomorrow } })
    .populate('user', 'fullName')
    .populate('court', 'name');

  res.status(200).json({ success: true, data: bookings });
});

exports.markBookingPaid = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id).populate('court');
  if (!booking) return res.status(404).json({ message: 'Not found' });

  booking.bookingStatus = 'Confirmed';
  booking.totalAmount = booking.court.pricePerHour || 0;
  booking.teamMembers.forEach((m) => (m.paymentStatus = 'Paid'));
  booking.paidAt = new Date();

  await booking.save();
  await booking.populate('user');
  notifyUserBookingStatus(booking, 'Confirmed');
  res.status(200).json({ success: true, data: booking });
});

exports.adminCancelBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) return res.status(404).json({ message: 'Not found' });

  booking.bookingStatus = 'Cancelled';
  booking.cancellationReason = req.body.reason || 'Admin Cancelled';

  await booking.save();
  await booking.populate('user');

  notifyUserBookingStatus(booking, 'Cancelled');
  res.status(200).json({ success: true, data: booking });
});

exports.markMemberPayment = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id).populate('court');
  if (!booking) return res.status(404).json({ message: 'Booking not found' });

  const member = booking.teamMembers.find((m) => String(m.userId) === req.params.userId);
  if (!member) return res.status(404).json({ message: 'Member not found in this booking' });

  member.paymentStatus = 'Paid';
  member.paidAt = new Date();

  // Auto-confirm if all paid
  if (booking.teamMembers.every((m) => m.paymentStatus === 'Paid')) {
    booking.bookingStatus = 'Confirmed';
    booking.totalAmount = booking.court.pricePerHour || 0;
  }

  await booking.save();
  res.status(200).json({ success: true, data: booking });
});

