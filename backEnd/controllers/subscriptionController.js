const Subscription = require('../models/Subscription');
const User = require('../models/User');
const Plan = require('../models/Plan');
const asyncHandler = require('express-async-handler');

// ===============================================
// --- USER FUNCTIONS ---
// ===============================================

/**
 * @desc    Get all available subscription plans
 * @route   GET /api/subscriptions/plans
 * @access  Private
 */
exports.getAllPlans = asyncHandler(async (req, res) => {
  const plans = await Plan.find({ active: true }).sort({ price: 1 });
  res.status(200).json({
    success: true,
    data: plans,
  });
});

/**
 * @desc    Get the current user's active subscription
 * @route   GET /api/subscriptions/my-subscription
 * @access  Private
 */
exports.getMySubscription = asyncHandler(async (req, res) => {
  const subscription = await Subscription.findOne({
    user: req.user.id,
    status: 'Active',
  });

  if (!subscription) {
    return res.status(404).json({ 
      success: false,
      message: 'No active subscription found' 
    });
  }

  res.status(200).json({
    success: true,
    data: subscription,
  });
});

/**
 * @desc    Purchase or renew a subscription
 * @route   POST /api/subscriptions/purchase
 * @access  Private
 */
exports.purchaseSubscription = asyncHandler(async (req, res) => {
  const { planId, paymentId } = req.body;
  const userId = req.user.id;

  if (!planId || !paymentId) {
    return res.status(400).json({ message: 'Plan ID and Payment ID are required' });
  }

  // 1. Find the selected plan
  const plan = await Plan.findOne({ planId });
  if (!plan) {
    return res.status(404).json({ message: 'Plan not found' });
  }

  // 2. Find the user
  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  // 3. Find existing active subscription to see if this is a renewal
  const existingSub = await Subscription.findOne({ user: userId, status: 'Active' });
  
  let startDate = new Date();
  // If user already has a sub, start new one when the old one expires
  if (existingSub && existingSub.expiryDate > startDate) {
    startDate = existingSub.expiryDate;
  }
  
  let expiryDate = new Date(startDate);
  expiryDate.setDate(expiryDate.getDate() + plan.durationDays);

  // 4. Deactivate old subscription (if one exists)
  if (existingSub) {
    existingSub.status = 'Inactive';
    existingSub.notes = (existingSub.notes || '') + ' | Deactivated due to new plan purchase';
    await existingSub.save();
  }

  // 5. Create new subscription
  const newSubscription = await Subscription.create({
    user: userId,
    plan: plan._id,
    planName: plan.name,
    days: plan.durationDays,
    amount: plan.price,
    startDate,
    expiryDate,
    status: 'Active',
    paymentId,
    addedBy: 'User',
    notes: 'Purchased via app',
  });
  
  // 6. Update the user's membership status
  const daysLeft = Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24));
  user.membership = {
    status: 'Active',
    expiryDate: expiryDate,
    daysLeft: daysLeft,
  };
  await user.save();

  res.status(201).json({
    success: true,
    message: 'Subscription purchased successfully!',
    data: newSubscription,
  });
});

// ===============================================
// --- ADMIN FUNCTIONS ---
// ===============================================

/**
 * @desc    Search users by name or phone
 * @route   GET /api/subscriptions/admin/users/search
 * @access  Private/Admin
 */
exports.searchUsers = asyncHandler(async (req, res) => {
  const { query } = req.query;

  if (!query || query.length < 2) {
    return res.status(400).json({ message: 'Query must be at least 2 characters' });
  }

  const users = await User.find({
    $or: [
      { fullName: { $regex: query, $options: 'i' } },
      { phone: { $regex: query, $options: 'i' } },
    ],
  })
    .select('_id fullName email phone membership')
    .limit(20);

  res.status(200).json({
    success: true,
    count: users.length,
    data: users,
  });
});

/**
 * @desc    Get user's subscription details
 * @route   GET /api/subscriptions/admin/subscription/:userId
 * @access  Private/Admin
 */
exports.getUserSubscription = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const subscription = await Subscription.findOne({ user: userId, status: 'Active' })
    .populate('user', 'fullName email phone');

  if (!subscription) {
    return res.status(404).json({
      success: false,
      message: 'No active subscription found for this user',
    });
  }

  res.status(200).json({
    success: true,
    data: subscription,
  });
});

/**
 * @desc    Add subscription to user (Offline Payment)
 * @route   POST /api/subscriptions/admin/subscription/add
 * @access  Private/Admin
 */
exports.addSubscription = asyncHandler(async (req, res) => {
  const { userId, days, amount, notes } = req.body;

  // Validation
  if (!userId || !days || !amount) {
    return res.status(400).json({
      success: false,
      message: 'User ID, days, and amount are required',
    });
  }
  
  // Find user
  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ 
      success: false,
      message: 'User not found' 
    });
  }

  // Find existing active subscription
  const existingSubscription = await Subscription.findOne({ 
    user: userId, 
    status: 'Active' 
  });
  
  // Calculate start date
  let startDate = new Date();
  if (existingSubscription && existingSubscription.expiryDate > startDate) {
    startDate = existingSubscription.expiryDate; // Start new plan after old one ends
  }

  // Calculate expiry date
  const expiryDate = new Date(startDate);
  expiryDate.setDate(expiryDate.getDate() + parseInt(days));

  // Deactivate previous subscription if exists
  if (existingSubscription) {
    existingSubscription.status = 'Inactive';
    existingSubscription.cancelledAt = new Date();
    existingSubscription.notes = (existingSubscription.notes || '') + ' | Replaced by new subscription';
    await existingSubscription.save();
  }

  // Create new subscription with all required fields
  const subscription = await Subscription.create({
    user: userId,
    planName: `${days}-Day Admin Plan`,
    days: parseInt(days),
    amount: parseInt(amount),
    startDate,
    expiryDate,
    status: 'Active',
    addedBy: req.user?.fullName || 'Admin',
    notes: notes || 'Added by admin',
    paymentId: 'OFFLINE', // Mark as offline payment
  });

  // Update user membership status
  const daysLeft = Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24));
  user.membership = {
    status: 'Active',
    daysLeft: daysLeft,
    expiryDate: expiryDate,
  };
  await user.save();

  res.status(201).json({
    success: true,
    message: `✓ Subscription added: ${days} days for ₹${amount}`,
    data: subscription,
  });
});

/**
 * @desc    Cancel user subscription
 * @route   DELETE /api/subscriptions/admin/subscription/:userId
 * @access  Private/Admin
 */
exports.cancelSubscription = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { reason } = req.body;

  // Find active subscription for user
  const subscription = await Subscription.findOne({ 
    user: userId, 
    status: 'Active' 
  });

  if (!subscription) {
    return res.status(404).json({ 
      success: false,
      message: 'Active subscription not found for this user' 
    });
  }

  // Update subscription status
  subscription.status = 'Inactive';
  subscription.notes = (subscription.notes || '') + ` | Cancelled: ${reason || 'No reason provided'}`;
  subscription.cancelledAt = new Date();
  await subscription.save();

  // Update user membership
  const user = await User.findById(userId);
  if (user) {
    user.membership = {
      status: 'Inactive',
      daysLeft: 0,
      expiryDate: new Date(),
    };
    await user.save();
  }

  res.status(200).json({
    success: true,
    message: 'Subscription cancelled successfully',
    data: subscription,
  });
});

/**
 * @desc    Get all subscriptions (for analytics)
 * @route   GET /api/subscriptions/admin/subscriptions
 * @access  Private/Admin
 */
exports.getAllSubscriptions = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;

  const query = {};
  if (status) query.status = status;

  const subscriptions = await Subscription.find(query)
    .populate('user', 'fullName phone email')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  const total = await Subscription.countDocuments(query);

  res.status(200).json({
    success: true,
    count: subscriptions.length,
    total,
    page: parseInt(page),
    pages: Math.ceil(total / limit),
    data: subscriptions,
  });
});

module.exports = exports;
