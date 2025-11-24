const mongoose = require('mongoose');

const courtSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    type: {
      type: String,
      enum: ['Premium', 'Standard'],
      default: 'Standard',
    },
    pricePerHour: {
      type: Number,
      required: true,
    },
    rating: {
      type: Number,
      default: 4.5,
      min: 0,
      max: 5,
    },
    reviews: {
      type: Number,
      default: 0,
    },
    features: [String], // ['AC', 'LED Lights', 'Professional Court']
    capacity: {
      type: Number,
      default: 4,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    operatingHours: {
      start: { type: String, default: '6:00 AM' },
      end: { type: String, default: '10:00 PM' },
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Court', courtSchema);
