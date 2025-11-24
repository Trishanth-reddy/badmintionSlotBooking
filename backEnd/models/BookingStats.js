const mongoose = require('mongoose');

const bookingStatsSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // One stats document per user
    },
    totalBookings: {
      type: Number,
      default: 0,
    },
    hoursPlayed: {
      type: Number,
      default: 0,
    },
    tournaments: {
      type: Number,
      default: 0,
    },
    lastBookedDate: Date,
    favoriteCourtId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Court'
    },
  },
  { timestamps: true }
);

// Performance Index
bookingStatsSchema.index({ user: 1 });

module.exports = mongoose.model('BookingStats', bookingStatsSchema);