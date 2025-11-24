const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
    },
    // Keeping it simple and fresh
    members: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        // Removed 'name' and 'membershipDays' to prevent stale data
        status: {
            type: String,
            enum: ['Invited', 'Accepted', 'Declined'],
            default: 'Accepted'
        }
      },
    ],
    captain: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Team', teamSchema);