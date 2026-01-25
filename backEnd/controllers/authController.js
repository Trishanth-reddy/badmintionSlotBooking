const User = require('../models/User');
const OtpLog = require('../models/OtpLog');
const { sendEmailOtp } = require('../services/emailService');
const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');

// Helper to generate token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// @desc    Step 1: Send OTP to verify email availability
// @route   POST /api/auth/send-register-otp
// @access  Public
exports.initiateRegistration = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) return res.status(400).json({ message: "Email is required" });

  // 1. Check if user already exists
  const userExists = await User.findOne({ email });
  if (userExists) {
    return res.status(400).json({ message: "User already exists. Please Login." });
  }

  // 2. Generate and Send OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const isSent = await sendEmailOtp(email, otp);

  if (!isSent) {
    return res.status(500).json({ message: "Failed to send verification email." });
  }

  // 3. Store OTP in DB (Upsert checks by email)
  await OtpLog.findOneAndUpdate(
    { email: email }, 
    { otp, expiresAt: new Date(Date.now() + 10 * 60000) }, 
    { upsert: true, new: true }
  );

  res.status(200).json({ 
    success: true, 
    message: `Verification code sent to ${email}` 
  });
});

// @desc    Step 2: Verify OTP and Create Account
// @route   POST /api/auth/register
// @access  Public
// @desc    Step 2: Verify OTP and Create Account
// @route   POST /api/auth/register
exports.register = asyncHandler(async (req, res) => {
  // 1. Destructure phone from req.body
  const { fullName, email, password, otp, phone } = req.body; 

  if (!fullName || !email || !password || !otp) {
    return res.status(400).json({ message: "All fields are required" });
  }

  // 2. Verify OTP... (Keep your existing OTP logic here)
  const otpRecord = await OtpLog.findOne({ email: email });
  if (!otpRecord || otpRecord.otp !== otp || otpRecord.expiresAt < new Date()) {
    return res.status(400).json({ message: "Invalid or expired OTP" });
  }

  // 3. Create User -> INCLUDE phone HERE
  const user = await User.create({
    fullName,
    email,
    password, 
    phone: phone || '', // Pass the phone number here
    role: 'user'
  });

  await OtpLog.deleteOne({ email: email });

  res.status(201).json({
    success: true,
    token: generateToken(user._id),
    user: {
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone, // Return it if you want
      role: user.role,
    }
  });
});

// @desc    Normal Login (Email + Password)
// @route   POST /api/auth/login
// @access  Public
// Inside backend/controllers/authController.js

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Please provide email and password" });
  }

  // 1. Find user & select password
  const user = await User.findOne({ email }).select('+password');

  // 2. Check Password
  if (user && (await user.matchPassword(password))) {
    
    // ✅ SEND THE ACTUAL DATA (This was likely missing/empty)
    res.json({
      success: true,
      token: generateToken(user._id),
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture,
        membership: user.membership
      },
    });

  } else {
    res.status(401).json({ message: "Invalid email or password" });
  }
});