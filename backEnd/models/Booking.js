const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    bookingId: {
      type: String,
      unique: true,
      required: true,
    },
    court: {
      type: mongoose.Schema.Types.ObjectId, // ✅ CORRECT: This allows .populate()
      ref: 'Court',
      required: true,
    },
    date: {
      type: Date, // ✅ CORRECT: This allows date queries ($gte, $lt)
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
    paidAt: Date, // Added this field
    cancelledAt: Date,
    cancellationReason: String,
  },
  { timestamps: true } // This automatically adds createdAt and updatedAt
);

// Indexes for faster queries
bookingSchema.index({ user: 1, date: 1 });
bookingSchema.index({ court: 1, date: 1 });
bookingSchema.index({ date: 1, bookingStatus: 1 });
bookingSchema.index({ bookingStatus: 1 });
bookingSchema.index({ 'teamMembers.userId': 1 });
bookingSchema.index({ bookingId: 1 });

module.exports = mongoose.model('Booking', bookingSchema);