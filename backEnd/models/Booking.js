const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    bookingId: {
      type: String,
      unique: true,
      required: true,
    },
    court: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Court',
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    startTime: {
      type: String,
      required: true,
    },
    endTime: {
      type: String,
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // The flag that determines if other users can see and request to join
    isPublic: {
      type: Boolean,
      default: false,
    },
    teamMembers: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        memberName: String,
        memberPhone: String,
        paymentStatus: {
          type: String,
          enum: ['Pending', 'Paid'],
          default: 'Pending',
        },
        paidAt: Date,
        paidBy: String,
      },
    ],
    joinRequests: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        status: {
          type: String,
          enum: ['Pending', 'Accepted', 'Declined'],
          default: 'Pending',
        },
        requestedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    totalPlayers: {
      type: Number,
      default: 1,
      max: 6,
    },
    bookingStatus: {
      type: String,
      enum: ['Pending', 'Confirmed', 'Cancelled', 'Completed'],
      default: 'Pending',
    },
    totalAmount: {
      type: Number,
      default: 0,
    },
    qrCode: String,
    checkInTime: Date,
    confirmedAt: Date,
    paidAt: Date,
    cancelledAt: Date,
    cancellationReason: String,
  },
  { timestamps: true }
);
// This prevents a User from being the Captain of two bookings on the same date
// --- UNIQUE CONSTRAINTS (The Ultimate Wall) ---

// 1. COURT LEVEL: No two captains can book the same court at the same time
bookingSchema.index(
  { court: 1, date: 1, startTime: 1 }, 
  { 
    unique: true, 
    name: "unique_court_slot",
    partialFilterExpression: { bookingStatus: { $in: ['Pending', 'Confirmed'] } } 
  }
);

// 2. USER LEVEL: A user cannot be a CAPTAIN of two bookings on the same day
bookingSchema.index(
  { user: 1, date: 1 }, 
  { 
    unique: true, 
    name: "unique_user_daily_quota",
    partialFilterExpression: { bookingStatus: { $in: ['Pending', 'Confirmed'] } } 
  }
);

// --- SEARCH INDEXES ---
bookingSchema.index({ isPublic: 1, bookingStatus: 1 });
bookingSchema.index({ 'teamMembers.userId': 1 });
bookingSchema.index({ bookingId: 1 });
// 1. No two captains can book the same court at the same time
bookingSchema.index(
  { court: 1, date: 1, startTime: 1 }, 
  { 
    unique: true, 
    name: "unique_court_slot",
    partialFilterExpression: { bookingStatus: { $in: ['Pending', 'Confirmed'] } } 
  }
);

// 2. A user cannot be a CAPTAIN of two different matches on the same day
bookingSchema.index(
  { user: 1, date: 1 }, 
  { 
    unique: true, 
    name: "unique_captain_daily_limit",
    partialFilterExpression: { bookingStatus: { $in: ['Pending', 'Confirmed'] } } 
  }
);

module.exports = mongoose.model('Booking', bookingSchema);