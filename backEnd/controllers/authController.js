const User = require('../models/User');
const asyncHandler = require('express-async-handler');
const { generateToken } = require('../utils/tokenService');

/**
 * @desc    Register user directly without OTP
 * @route   POST /auth/register
 * @access  Public
 */
exports.register = asyncHandler(async (req, res) => {
  const { fullName, email, phone, password } = req.body;

  // Validation
  if (!fullName || !email || !phone || !password) {
    return res.status(400).json({ 
      message: 'All fields are required' 
    });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ 
      message: 'Please enter a valid email address' 
    });
  }

  // Validate password length
  if (password.length < 8) {
    return res.status(400).json({ 
      message: 'Password must be at least 8 characters long' 
    });
  }

  // Check if user already exists
  const existingUser = await User.findOne({ 
    $or: [
      { email: email.toLowerCase() }, 
      { phone }
    ] 
  });

  if (existingUser) {
    const field = existingUser.email === email.toLowerCase() ? 'Email' : 'Phone number';
    return res.status(400).json({ 
      message: `${field} is already registered` 
    });
  }

  try {
    // Check if this is the admin email
    const isAdmin = email.toLowerCase() === 'admin@gmail.com';

    // Create user directly
    // The User model's pre-save hook will hash the password
    const user = await User.create({
      fullName,
      email: email.toLowerCase(),
      phone,
      password, // Plain text - will be hashed by pre-save hook
      isVerified: true, // Auto-verify since no OTP
      role: isAdmin ? 'admin' : 'user',
      membership: {
        status: 'Inactive',
        daysLeft: 0,
      },
    });

    // Generate JWT token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        membership: user.membership,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ 
      message: 'Could not create account. Please try again.',
      error: error.message 
    });
  }
});

/**
 * @desc    Login user
 * @route   POST /auth/login
 * @access  Public
 */
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ 
      message: 'Email and password are required' 
    });
  }

  // Find user and include password field
  const user = await User.findOne({ 
    email: email.toLowerCase() 
  }).select('+password');
  
  if (!user) {
    return res.status(401).json({ 
      message: 'Invalid email or password' 
    });
  }

  // Check if account is verified
  if (!user.isVerified) {
    return res.status(401).json({ 
      message: 'Please verify your email first' 
    });
  }

  // Verify password using User model method
  const isPasswordMatch = await user.matchPassword(password);
  
  if (!isPasswordMatch) {
    return res.status(401).json({ 
      message: 'Invalid email or password' 
    });
  }

  // Update last login
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  // Generate JWT token
  const token = generateToken(user._id);

  res.status(200).json({
    success: true,
    message: 'Login successful',
    token,
    user: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
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
    return res.status(404).json({ 
      message: 'User not found' 
    });
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
  const { fullName, phone, profilePicture } = req.body;

  const user = await User.findById(req.user.id);

  if (!user) {
    return res.status(404).json({ 
      message: 'User not found' 
    });
  }

  // Update fields if provided
  if (fullName) user.fullName = fullName;
  if (phone) user.phone = phone;
  if (profilePicture) user.profilePicture = profilePicture;

  await user.save();

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    data: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      profilePicture: user.profilePicture,
      membership: user.membership,
    },
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
    return res.status(400).json({ 
      message: 'Please provide current and new password' 
    });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ 
      message: 'New password must be at least 8 characters long' 
    });
  }

  const user = await User.findById(req.user.id).select('+password');

  if (!user) {
    return res.status(404).json({ 
      message: 'User not found' 
    });
  }

  // Verify current password
  const isMatch = await user.matchPassword(currentPassword);
  if (!isMatch) {
    return res.status(401).json({ 
      message: 'Current password is incorrect' 
    });
  }

  // Set new password (will be hashed by pre-save hook)
  user.password = newPassword;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Password changed successfully',
  });
});

/**
 * @desc    Logout user
 * @route   POST /auth/logout
 * @access  Private
 */
exports.logout = asyncHandler(async (req, res) => {
  // In a stateless JWT setup, logout is handled client-side
  // by removing the token from storage
  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
});

/**
 * @desc    Delete user account
 * @route   DELETE /auth/account
 * @access  Private
 */
exports.deleteAccount = asyncHandler(async (req, res) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ 
      message: 'Password is required to delete account' 
    });
  }

  const user = await User.findById(req.user.id).select('+password');

  if (!user) {
    return res.status(404).json({ 
      message: 'User not found' 
    });
  }

  // Verify password
  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    return res.status(401).json({ 
      message: 'Incorrect password' 
    });
  }

  await user.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Account deleted successfully',
  });
});

module.exports = exports;
