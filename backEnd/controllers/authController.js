const User = require('../models/User');
const OtpLog = require('../models/OtpLog');
const { sendEmailOtp } = require('../services/emailService'); // Must match exports
const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const bcrypt = require('bcryptjs'); // <--- ADD THIS LINE
// Helper to generate token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// @desc    Step 1: Send OTP to verify email availability
// @route   POST /api/auth/send-register-otp
// @access  Public
exports.initiateRegistration = asyncHandler(async (req, res) => {
  console.log("----------------------------------------------");
  console.log("[Auth] 1. Received Register Request");
  
  const { email } = req.body;
  console.log(`[Auth] 2. Email requested: "${email}"`);

  // 1. Validation
  if (!email) {
    console.log("[Auth] Error: Email missing in body");
    return res.status(400).json({ message: "Email is required" });
  }

  // 2. Check if user already exists
  const userExists = await User.findOne({ email });
  if (userExists) {
    console.log("[Auth] Error: User already exists");
    return res.status(400).json({ message: "User already exists. Please Login." });
  }

  // 3. Generate OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  console.log(`[Auth] 3. Generated OTP: ${otp}`);

  // 4. Send Email
  try {
    // Safety Check: Is the function loaded?
    if (typeof sendEmailOtp !== 'function') {
      throw new Error("sendEmailOtp is not a function. Check imports!");
    }

    console.log(`[Auth] 4. Calling Email Service...`);
    const isSent = await sendEmailOtp(email, otp);
    console.log(`[Auth] 5. Email Service Result: ${isSent}`);

    if (!isSent) {
      return res.status(500).json({ message: "Email failed to send. Check server logs." });
    }
  } catch (error) {
    console.error("[Auth] CRITICAL EMAIL ERROR:", error);
    return res.status(500).json({ 
      message: "Server failed to send email.", 
      error: error.message 
    });
  }

  // 5. Store OTP in DB
  try {
    console.log("[Auth] 6. Saving OTP to Database...");
    await OtpLog.findOneAndUpdate(
      { email: email }, 
      { otp, expiresAt: new Date(Date.now() + 10 * 60000) }, 
      { upsert: true, new: true }
    );
    console.log("[Auth] 7. OTP Saved. Success!");
  } catch (dbError) {
    console.error("[Auth] Database Error:", dbError);
    return res.status(500).json({ message: "Database error saving OTP" });
  }

  res.status(200).json({ 
    success: true, 
    message: `Verification code sent to ${email}` 
  });
});

// @desc    Step 2: Verify OTP and Create Account
// @route   POST /api/auth/register
// @access  Public
exports.register = asyncHandler(async (req, res) => {
  const { fullName, email, password, otp, phone } = req.body;

  if (!fullName || !email || !password || !otp) {
    return res.status(400).json({ message: "All fields are required" });
  }

  if (phone) {
    const phoneRegex = /^\d{10}$/; 
    if (!phoneRegex.test(phone)) {
       return res.status(400).json({ message: "Phone number must be exactly 10 digits." });
    }
  }

  const otpRecord = await OtpLog.findOne({ email: email });
  
  if (!otpRecord || otpRecord.otp !== otp || otpRecord.expiresAt < new Date()) {
    return res.status(400).json({ message: "Invalid or expired OTP" });
  }

  const user = await User.create({
    fullName,
    email,
    password, 
    phone: phone || '', 
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
      phone: user.phone, 
      role: user.role,
    }
  });
});

// @desc    Normal Login
// @route   POST /api/auth/login
// @access  Public
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Please provide email and password" });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail }).select('+password');

  if (user && (await user.matchPassword(password))) {
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

// @desc    Change Password
// @route   PUT /api/auth/updatepassword
// @access  Private
exports.updatePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  // 1. Get user from DB (req.user.id comes from protect middleware)
  const user = await User.findById(req.user.id).select('+password');

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // 2. Check if Old Password matches
  const isMatch = await bcrypt.compare(oldPassword, user.password);
  if (!isMatch) {
    res.status(401);
    throw new Error('Incorrect old password');
  }

  // 3. Hash New Password and Save
  const salt = await bcrypt.genSalt(10);
  // CORRECT WAY in authController.js
user.password = newPassword; // Pass plain text (e.g., "secret123")
await user.save(); // Model detects change -> Hashes it once -> Saves to DB

  res.status(200).json({
    success: true,
    message: 'Password updated successfully',
    // Optional: Send new token if you want to refresh it
  });
});