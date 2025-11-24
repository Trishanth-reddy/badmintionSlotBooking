const cron = require('node-cron');
const User = require('../models/User'); 
const { notifyMembershipExpiry } = require('./notificationService'); 

/**
 * Finds all users with active subscriptions expiring in roughly 1 to 3 days.
 */
const checkAndSendExpiryNotifications = async () => {
  console.log(`\n--- 🕒 [${new Date().toISOString()}] Running Expiry Check ---`);
  
  try {
    const today = new Date();
    // normalize 'today' to get accurate day difference
    today.setHours(0, 0, 0, 0);

    // 1. Define the Search Window
    // Start: Tomorrow at 00:00:00
    const searchStart = new Date(today);
    searchStart.setDate(today.getDate() + 1);

    // End: 4 Days from now at 00:00:00 (Exclusive)
    // This ensures we catch everything for days 1, 2, and 3
    const searchEnd = new Date(today);
    searchEnd.setDate(today.getDate() + 4);

    console.log(`🔎 Searching for expiry dates between:`);
    console.log(`   Start: ${searchStart.toISOString()}`);
    console.log(`   End:   ${searchEnd.toISOString()}`);

    // 2. Broad Query: Get everyone expiring in this window
    // We use $gte (Greater Than Equal) and $lt (Less Than) to handle times correctly
    const usersToNotify = await User.find({
      'membership.status': 'Active',
      'membership.expiryDate': { 
        $gte: searchStart, 
        $lt: searchEnd 
      }
    }).select('fullName membership.expoPushToken membership.expiryDate');

    // --- DEBUG LOG: Print EVERYONE found ---
    if (usersToNotify.length === 0) {
        console.log('❌ No users found in this date range.');
        
        // EXTRA DEBUG: Print ALL active users to see where they actually are
        const allActive = await User.find({'membership.status': 'Active'}).select('fullName membership.expiryDate');
        console.log("📋 --- ALL ACTIVE USERS IN DB (For Debugging) ---");
        allActive.forEach(u => {
            console.log(`   User: ${u.fullName} | Expires: ${u.membership.expiryDate}`);
        });
        console.log("------------------------------------------------");
        return;
    }

    console.log(`✅ Found ${usersToNotify.length} potential users.`);

    // 3. Loop through and verify specific days
    for (const user of usersToNotify) {
      const expiry = new Date(user.membership.expiryDate);
      
      // Calculate difference in milliseconds
      // We normalize 'expiry' to midnight to match 'today'
      const expiryMidnight = new Date(expiry);
      expiryMidnight.setHours(0,0,0,0);

      const diffTime = expiryMidnight.getTime() - today.getTime();
      const daysLeft = Math.round(diffTime / (1000 * 60 * 60 * 24));

      console.log(`   👤 Checking: ${user.fullName}`);
      console.log(`      Expiry: ${expiry.toISOString()}`);
      console.log(`      Days Left Calc: ${daysLeft}`);

      // Only notify if exactly 1, 2, or 3 days
      if ([1, 2, 3].includes(daysLeft)) {
          console.log(`      🔔 SENDING NOTIFICATION (${daysLeft} days left)`);
          await notifyMembershipExpiry(user, daysLeft);
      } else {
          console.log(`      Unknown day range (${daysLeft}), skipping.`);
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
  // Runs every minute for testing ('* * * * *')
  // Change to ('0 10 * * *') for production (10 AM Daily)
  const cronString = '0 10 * * *'; 

  console.log(`Scheduler set to run with pattern: "${cronString}"`);

  cron.schedule(cronString, checkAndSendExpiryNotifications, {
    timezone: "Asia/Kolkata"
  });
};

module.exports = { scheduleExpiryNotifications };