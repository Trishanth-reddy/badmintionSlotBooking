const mongoose = require('mongoose');

const planSchema = new mongoose.Schema(
  {
    planId: {
      type: String,
      enum: ['monthly', 'quarterly', 'yearly'],
      unique: true,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    duration: {
      type: String,
      required: true,
    },
    durationDays: {
      type: Number,
      required: true,
    },
    bookingHours: {
      type: Number,
      required: true,
    },
    guestPasses: {
      type: Number,
      required: true,
    },
    features: [String],
    savings: String,
    popular: Boolean,
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Plan', planSchema);
