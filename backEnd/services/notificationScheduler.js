const cron = require('node-cron');
const User = require('../models/User'); 
const { notifyMembershipExpiry } = require('./notificationService'); 

const checkAndSendExpiryNotifications = async () => {
  console.log(`\n--- 🕒 [${new Date().toISOString()}] Running Expiry Check ---`);
  
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize 'today' to midnight

    // 1. Fetch ALL Active Users (Safer than date ranges to ensure we catch expired users)
    const activeUsers = await User.find({
      'membership.status': 'Active',
      'membership.expiryDate': { $exists: true }
    });

    if (activeUsers.length === 0) {
        console.log('✅ No active memberships found.');
        return;
    }

    console.log(`🔎 Checking ${activeUsers.length} active users...`);

    for (const user of activeUsers) {
      const expiry = new Date(user.membership.expiryDate);
      expiry.setHours(0, 0, 0, 0); // Normalize expiry to midnight

      // Calculate difference in days
      const diffTime = expiry.getTime() - today.getTime();
      const daysLeft = Math.round(diffTime / (1000 * 60 * 60 * 24));

      // --- LOGIC 1: AUTO-DEACTIVATE EXPIRED USERS ---
      if (daysLeft < 0) {
          console.log(` ❌ [EXPIRED] Deactivating ${user.fullName} (Expired ${Math.abs(daysLeft)} days ago)`);
          
          user.membership.status = 'Inactive';
          user.membership.lastWarningDay = null; // Reset for future renewals
          await user.save();
          
          // Send "Expired" notification (only once because status changes to Inactive immediately)
          await notifyMembershipExpiry(user, daysLeft); 
          continue; // Skip the rest of the loop
      }

      // --- LOGIC 2: SEND REMINDERS (5, 3, 1, 0 Days) ---
      if ([5, 3, 1, 0].includes(daysLeft)) {
          
          // 🛑 CHECK: Did we already send this specific warning?
          if (user.membership.lastWarningDay === daysLeft) {
              console.log(` ⏭️ [SKIP] Already notified ${user.fullName} for ${daysLeft} days left.`);
              continue;
          }

          console.log(` 🔔 [NOTIFY] ${user.fullName} has ${daysLeft} days left.`);
          
          // 1. Send Notification
          await notifyMembershipExpiry(user, daysLeft);

          // 2. Mark as Sent in DB
          user.membership.lastWarningDay = daysLeft;
          await user.save();
      } 
      // Reset logic: If user moves from day 5 to day 4, reset the flag so day 3 can trigger later
      else if (user.membership.lastWarningDay !== null && user.membership.lastWarningDay !== daysLeft) {
          user.membership.lastWarningDay = null;
          await user.save();
      }
    }
    
    console.log('--- ✅ Expiry check complete ---\n');

  } catch (error) {
    console.error('Error in subscription expiry cron job:', error);
  }
};

/**
 * Schedules the cron job.
 */
const scheduleExpiryNotifications = () => {
  // Testing: Run Every Minute
  const cronString = '0 10 * * *'; 

  console.log(`📅 Scheduler initialized. Pattern: "${cronString}"`);

  cron.schedule(cronString, checkAndSendExpiryNotifications, {
    timezone: "Asia/Kolkata"
  });
};

module.exports = { scheduleExpiryNotifications };