const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Plan',
    },
    planName: {
      type: String,
      default: 'Custom Plan' 
    },
    days: {
      type: Number,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    expiryDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive', 'Expired', 'Cancelled'],
      default: 'Active',
    },
    addedBy: {
      type: String, 
      required: true,
    },
    paymentId: String,
    cancelledAt: Date,
    expiryNotificationSent: {
      type: Boolean,
      default: false,
    },
    notes: String,
  },
  { timestamps: true }
);

// CRITICAL INDEXES
// 1. Enforce uniqueness for Active subscriptions only (Optional but recommended)
// subscriptionSchema.index({ user: 1, status: 1 }, { unique: true, partialFilterExpression: { status: 'Active' } });

// 2. Speed up Cron Job
subscriptionSchema.index({ expiryDate: 1, status: 1 });

// 3. Speed up User Profile load
subscriptionSchema.index({ user: 1, status: 1 });

module.exports = mongoose.model('Subscription', subscriptionSchema);