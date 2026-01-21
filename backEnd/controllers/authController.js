const User = require('../models/User');
const asyncHandler = require('express-async-handler');
const { generateToken } = require('../utils/tokenService');

/**
 * @desc    Register user (Phone Mandatory, Email Optional)
 * @route   POST /auth/register
 * @access  Public
 */
exports.register = asyncHandler(async (req, res) => {
  const { fullName, phone, password, email } = req.body;

  // 1. Mandatory Field Validation
  if (!fullName || !phone || !password) {
    return res.status(400).json({ 
      message: 'Full name, phone, and password are required' 
    });
  }

  if (password.length < 8) {
    return res.status(400).json({ 
      message: 'Password must be at least 8 characters long' 
    });
  }

  // 2. Conflict Check: Check phone and (if provided) email
  const query = [{ phone }];
  if (email && email.trim() !== "") {
    query.push({ email: email.toLowerCase() });
  }

  const existingUser = await User.findOne({ $or: query });

  if (existingUser) {
    const field = existingUser.phone === phone ? 'Phone number' : 'Email';
    return res.status(400).json({ 
      message: `${field} is already registered` 
    });
  }

  // 3. Create User
  // Admin check: strictly based on email if it exists
  const isAdmin = email?.toLowerCase() === 'admin@gmail.com';

  const user = await User.create({
    fullName,
    phone,
    password, 
    email: email && email.trim() !== "" ? email.toLowerCase() : undefined,
    isVerified: true, 
    role: isAdmin ? 'admin' : 'user',
    membership: {
      status: 'Inactive',
      daysLeft: 0,
    },
  });

  const token = generateToken(user._id);

  res.status(201).json({
    success: true,
    message: 'Account created successfully',
    token,
    user: {
      id: user._id,
      fullName: user.fullName,
      phone: user.phone,
      email: user.email,
      role: user.role,
      membership: user.membership,
    },
  });
});

/**
 * @desc    Login user via Phone
 * @route   POST /auth/login
 * @access  Public
 */
exports.login = asyncHandler(async (req, res) => {
  const { phone, password } = req.body;

  if (!phone || !password) {
    return res.status(400).json({ 
      message: 'Phone and password are required' 
    });
  }

  // Find user and include password for comparison
  const user = await User.findOne({ phone }).select('+password');
  
  if (!user || !(await user.matchPassword(password))) {
    return res.status(401).json({ 
      message: 'Invalid phone number or password' 
    });
  }

  // Update last login
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  const token = generateToken(user._id);

  res.status(200).json({
    success: true,
    message: 'Login successful',
    token,
    user: {
      id: user._id,
      fullName: user.fullName,
      phone: user.phone,
      email: user.email,
      role: user.role,
      membership: user.membership,
      profilePicture: user.profilePicture,
    },
  });
});

/**
 * @desc    Get current user profile
 * @route   GET /auth/profile
 * @access  Private
 */
exports.getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('-password');

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  res.status(200).json({
    success: true,
    data: user,
  });
});

/**
 * @desc    Update user profile
 * @route   PUT /auth/profile
 * @access  Private
 */
exports.updateProfile = asyncHandler(async (req, res) => {
  const { fullName, phone, email, profilePicture, bio } = req.body;

  const user = await User.findById(req.user.id);

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  // Phone collision check
  if (phone && phone !== user.phone) {
    const phoneExists = await User.findOne({ phone });
    if (phoneExists) return res.status(400).json({ message: 'Phone number already in use' });
    user.phone = phone;
  }

  // Email collision check (only if email is provided)
  if (email && email.toLowerCase() !== user.email) {
    const emailExists = await User.findOne({ email: email.toLowerCase() });
    if (emailExists) return res.status(400).json({ message: 'Email already in use' });
    user.email = email.toLowerCase();
  }

  if (fullName) user.fullName = fullName;
  if (profilePicture) user.profilePicture = profilePicture;
  if (bio) user.bio = bio;

  await user.save();

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    data: user,
  });
});

/**
 * @desc    Change password
 * @route   PUT /auth/change-password
 * @access  Private
 */
exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Provide both current and new passwords' });
  }

  const user = await User.findById(req.user.id).select('+password');

  const isMatch = await user.matchPassword(currentPassword);
  if (!isMatch) {
    return res.status(401).json({ message: 'Current password is incorrect' });
  }

  user.password = newPassword; 
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Password updated successfully',
  });
});

/**
 * @desc    Delete user account
 * @route   DELETE /auth/account
 * @access  Private
 */
exports.deleteAccount = asyncHandler(async (req, res) => {
  const { password } = req.body;

  const user = await User.findById(req.user.id).select('+password');

  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    return res.status(401).json({ message: 'Incorrect password' });
  }

  await user.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Account deleted successfully',
  });
});

/**
 * @desc    Logout user (Stateless)
 */
exports.logout = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
});