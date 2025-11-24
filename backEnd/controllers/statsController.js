const BookingStats = require('../models/BookingStats');
const Booking = require('../models/Booking');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const Court = require('../models/Court');
const asyncHandler = require('express-async-handler');

// @desc    Get user's stats
// @route   GET /api/stats/my-stats
// @access  Private
exports.getUserStats = asyncHandler(async (req, res) => {
  
  // --- START OF FIX ---
  // Using findOneAndUpdate with 'upsert: true' prevents a race condition
  // where the server might try to create two stats doc for the same user.
  // This is an "atomic" operation and fixes the 500 error.
  const stats = await BookingStats.findOneAndUpdate(
    { user: req.user.id },
    { $setOnInsert: { 
        user: req.user.id,
        totalBookings: 0,
        hoursPlayed: 0,
        tournaments: 0,
      } 
    },
    { new: true, upsert: true, runValidators: true }
  );
  // --- END OF FIX ---

  res.status(200).json({
    success: true,
    data: stats,
  });
});

// @desc    Get all users stats (Admin only)
// @route   GET /api/stats/admin/all
// @access  Private/Admin
exports.getAllStats = asyncHandler(async (req, res) => {
  const stats = await BookingStats.find()
    .populate('user', 'fullName email')
    .sort({ totalBookings: -1 });

  res.status(200).json({
    success: true,
    count: stats.length,
    data: stats,
  });
});


// ===============================================
// --- ADMIN DASHBOARD & ANALYTICS ---
// ===============================================

// @desc    Get aggregated stats for Admin Dashboard
// @route   GET /api/stats/admin/dashboard
// @access  Private/Admin
exports.getDashboardStats = asyncHandler(async (req, res) => {
  // Get today's date range
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  // Run queries in parallel
  const [
    totalUsers,
    activeMembers,
    todayBookings,
  ] = await Promise.all([
    User.countDocuments(),
    Subscription.countDocuments({ status: 'Active' }),
    Booking.find({
      date: { $gte: today, $lt: tomorrow }
    }).populate('user', 'fullName').populate('court', 'name').sort({ startTime: 1 })
  ]);

  // Calculate stats from today's bookings
  const bookingsToday = todayBookings.length;
  // This counts *pending payments* as queries
  const pendingQueries = todayBookings.filter(b => b.bookingStatus === 'Pending').length;

  res.status(200).json({
    success: true,
    data: {
      stats: {
        totalUsers,
        activeMembers,
        bookingsToday,
        pendingQueries,
      },
      recentBookings: todayBookings.slice(0, 5), // Send first 5
    },
  });
});


// @desc    Get aggregated stats for Analytics Screen
// @route   GET /api/stats/admin/analytics
// @access  Private/Admin
exports.getAnalyticsStats = asyncHandler(async (req, res) => {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  // 1. Get Revenue and Court Popularity stats from Bookings
  const bookingStats = await Booking.aggregate([
    {
      $match: { bookingStatus: 'Confirmed' } // Only count confirmed/paid bookings
    },
    {
      $facet: {
        // A: Calculate total revenue
        totalRevenue: [
          {
            $group: {
              _id: null,
              total: { $sum: '$totalAmount' }
            }
          }
        ],
        // B: Calculate court popularity
        courtPopularity: [
          { $group: { _id: '$court', bookings: { $sum: 1 } } },
          { $sort: { bookings: -1 } },
          {
            $lookup: {
              from: 'courts', // The actual collection name for 'Court' model
              localField: '_id',
              foreignField: '_id',
              as: 'courtDetails'
            }
          },
          { $unwind: '$courtDetails' },
          { $project: { name: '$courtDetails.name', bookings: 1, _id: 0 } }
        ],
        // C: Calculate revenue for last 7 days
        revenueLast7Days: [
          { $match: { date: { $gte: sevenDaysAgo } } },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
              revenue: { $sum: '$totalAmount' }
            }
          },
          { $sort: { _id: 1 } }
        ]
      }
    }
  ]);

  // 2. Get New Users count
  const newUsers = await User.countDocuments({
    createdAt: { $gte: sevenDaysAgo }
  });

  // 3. Process the aggregated data
  const totalRevenue = bookingStats[0].totalRevenue[0]?.total || 0;
  const courtPopularity = bookingStats[0].courtPopularity;
  
  const totalBookings = await Booking.countDocuments({ bookingStatus: 'Confirmed' });
  const avgPerBooking = totalBookings > 0 ? Math.round(totalRevenue / totalBookings) : 0;

  // --- Format 7-Day Revenue ---
  const daysMap = new Map();
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const dateString = d.toISOString().split('T')[0]; // "YYYY-MM-DD"
    daysMap.set(dateString, { day: days[d.getDay()], revenue: 0 });
  }
  
  bookingStats[0].revenueLast7Days.forEach(item => {
    if (daysMap.has(item._id)) {
      daysMap.get(item._id).revenue = item.revenue;
    }
  });

  const revenueLast7Days = Array.from(daysMap.values());
  // --- End 7-Day Revenue ---

  res.status(200).json({
    success: true,
    data: {
      totalRevenue,
      avgPerBooking,
      newUsers,
      revenueLast7Days,
      courtPopularity,
    },
  });
});
