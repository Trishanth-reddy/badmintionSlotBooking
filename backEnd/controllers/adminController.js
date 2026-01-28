const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const Booking = require('../models/Booking');
// 👇 IMPORT NOTIFICATION SERVICE
const { sendPushNotification } = require('../services/notificationService'); 

// @desc    Get Admin Dashboard Stats
// @route   GET /api/admin/stats
// @access  Private/Admin
exports.getDashboardStats = asyncHandler(async (req, res) => {
  const activeMembers = await User.countDocuments({ 'membership.status': 'Active' });
  const totalBookings = await Booking.countDocuments({ bookingStatus: 'Confirmed' });
  const totalUsers = await User.countDocuments({});
  const pendingBookings = await Booking.countDocuments({ bookingStatus: 'Pending' });

  // Get recent 5 bookings
  const recentBookings = await Booking.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('user', 'fullName email')
      .populate('court', 'name');

  res.status(200).json({
    success: true,
    data: {
      stats: { activeMembers, totalBookings, totalUsers, pendingBookings },
      recentBookings
    }
  });
});

// @desc    Get all users (Admin View)
// @route   GET /api/admin/users
// @access  Private/Admin
exports.getAllUsers = asyncHandler(async (req, res) => {
  const { search, status, page = 1, limit = 20 } = req.query; 

  let query = {};

  if (search && search.length > 1) {
    query.$or = [
      { fullName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
    ];
  }

  if (status && status !== 'all') {
    const statusQuery = status === 'active' ? 'Active' : { $ne: 'Active' };
    query['membership.status'] = statusQuery;
  }

  const users = await User.find(query)
    .sort({ createdAt: -1 }) // Newest first
    .skip((page - 1) * limit)
    .limit(parseInt(limit))
    .lean();

  // Calculate days left for display
  const now = new Date();
  const enrichedUsers = users.map(u => {
    const membership = u.membership || {};
    let daysLeft = 0;
    if (membership.expiryDate) {
      daysLeft = Math.max(0, Math.ceil((new Date(membership.expiryDate) - now) / (86400000)));
    }
    return { ...u, membership: { ...membership, daysLeft } };
  });

  const totalUsers = await User.countDocuments(query);

  res.status(200).json({
    success: true,
    count: enrichedUsers.length,
    total: totalUsers,
    data: enrichedUsers,
  });
});

// @desc    Extend Membership (Add Days)
// @route   PUT /api/admin/users/:id/extend
// @access  Private/Admin
exports.extendMembership = asyncHandler(async (req, res) => {
  const { days } = req.body;
  const user = await User.findById(req.params.id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  const daysToAdd = parseInt(days, 10);
  
  // Logic: If already active and in future, add to expiry. If expired, start from today.
  const currentExpiry = user.membership.expiryDate && new Date(user.membership.expiryDate) > new Date()
      ? new Date(user.membership.expiryDate)
      : new Date(); 

  currentExpiry.setDate(currentExpiry.getDate() + daysToAdd);
  
  // 1. Update Membership Data
  user.membership.expiryDate = currentExpiry;
  user.membership.status = 'Active';
  
  // 🚨 CRITICAL FIX: Reset the warning log. 
  // This ensures the 5/3/1 day warnings will fire again for this new period.
  user.membership.lastWarningDay = null; 

  await user.save();

  // 2. Send Push Notification to User
  if (user.membership.expoPushToken) {
      const formattedDate = currentExpiry.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      await sendPushNotification(
          user.membership.expoPushToken,
          'Membership Extended! 🚀',
          `Your membership has been extended by ${daysToAdd} days. Valid until ${formattedDate}.`,
          { screen: 'Membership' }
      );
  }

  res.status(200).json({
    success: true,
    message: `Extended by ${daysToAdd} days`,
    data: user
  });
});

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
exports.deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  
  // Optional: Clean up bookings associated with this user?
  // await Booking.deleteMany({ user: req.params.id });

  res.status(200).json({ success: true, message: 'User deleted successfully' });
});