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
      type: String, // Format: "06:00 PM"
      required: true,
    },
    endTime: {
      type: String,
      required: true,
    },
    user: { // The Captain
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // --- KEY FIELD FOR COLOR LOGIC ---
    // false = Private (Red), true = Public (Blue)
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
    // Optional Metadata
    checkInTime: Date,
    confirmedAt: Date,
    paidAt: Date,
    cancelledAt: Date,
    cancellationReason: String,
  },
  { timestamps: true }
);

// --- UNIQUE CONSTRAINTS ---

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

module.exports = mongoose.model('Booking', bookingSchema);