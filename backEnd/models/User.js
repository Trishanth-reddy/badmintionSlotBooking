const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Please provide a full name'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Please provide a phone number'],
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      unique: true, 
      sparse: true,    // Allows multiple users to have no email
      lowercase: true,
      trim: true,
      // FIX: Use a custom validator instead of 'match'
      validate: {
        validator: function(v) {
          // If email is null, undefined, or empty string, it's valid (optional)
          if (!v || v.trim() === "") return true;
          // Otherwise, check the regex
          return /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(v);
        },
        message: 'Please enter a valid email address'
      }
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: 8,
      select: false, 
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    otp: String,
    otpExpiry: Date,
    isVerified: {
      type: Boolean,
      default: false,
    },
    profilePicture: {
      type: String,
      default: null,
    },
    bio: { type: String, default: '' },
    membership: {
      status: { 
        type: String, 
        enum: ['Active', 'Inactive'], 
        default: 'Inactive' 
      },
      daysLeft: { type: Number, default: 0 },
      expiryDate: { type: Date, default: null },
      expoPushToken: { type: String, default: null }, 
    },
    lastLogin: Date,
  },
  { timestamps: true }
);

// Indexes
userSchema.index({ phone: 1 });

// Password Hashing
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);