const mongoose = require('mongoose');

const otpLogSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      index: true,
    },
    otp: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      // Automatically delete the document 1 minute after it expires
      expires: 60, 
    },
    attempts: {
      type: Number,
      default: 0,
    },
    maxAttempts: {
      type: Number,
      default: 5,
    },
    isUsed: {
      type: Boolean,
      default: false,
    },
    // This is the CRITICAL field that was missing.
    // It temporarily stores the user's registration data
    // until they verify their email.
    userData: {
      type: Object, // Stores { fullName, phone, password, role }
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('OtpLog', otpLogSchema);
