const User = require('../models/User');
// NOTE: We do NOT require('node-fetch') because Node.js v18+ has it built-in.

/**
 * Sends a push notification using Expo's push notification service.
 * @param {string} pushToken The user's ExpoPushToken.
 * @param {string} title The title of the notification.
 * @param {string} body The message body.
 */
const sendPushNotification = async (pushToken, title, body) => {
  console.log(`🚀 [DEBUG] Sending to: ${pushToken}`); 
  
  const message = {
    to: pushToken,
    sound: 'default',
    title: title,
    body: body,
    data: { screen: 'BookingsTab' }, // Helps deep linking if implemented later
  };

  try {
    // Using Node.js Native Fetch
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    // Log the receipt status from Expo
    const data = await response.json();
    console.log('🔔 Expo Receipt:', data.data?.status || data);

  } catch (error) {
    console.error(`Error sending push notification: ${error}`);
  }
};

/**
 * 1. Notify Admin(s) about new Booking
 */
const notifyAdminNewBooking = async (booking) => {
  if (!booking) return; // Safety Check
  console.log("🔎 Looking for Admins to notify..."); 
  
  try {
    // Find all users with 'admin' role
    const admins = await User.find({ role: 'admin' });
    
    for (const admin of admins) {
      const token = admin.membership?.expoPushToken;
      
      if (token) {
        await sendPushNotification(
          token,
          'New Booking Request 🏸',
          `Booking ${booking.bookingId} is pending approval.`
        );
      } else {
          console.log(`⚠️ Admin ${admin.fullName} has no push token.`);
      }
    }
  } catch (error) {
    console.error('Error notifying admins:', error);
  }
};

/**
 * 2. Notify User about Booking Status
 */
const notifyUserBookingStatus = async (booking, status) => {
  // Safety Check
  if (!booking || !booking.user) {
      console.error("❌ Error: notifyUserBookingStatus received undefined booking.");
      return; 
  }

  console.log(`🔎 Notifying User ${booking.user} about status: ${status}`);
  
  try {
    const user = await User.findById(booking.user);
    const token = user?.membership?.expoPushToken;
    
    if (!token) {
        console.log("❌ User has no token saved.");
        return;
    }

    const title = status === 'Confirmed' ? 'Booking Confirmed! ✅' : 'Booking Cancelled ❌';
    const body = status === 'Confirmed' 
      ? `Your booking is confirmed. Please arrive on time!`
      : `Your booking has been cancelled.`;
    
    await sendPushNotification(token, title, body);
  } catch (error) {
    console.error('Error finding user for notification:', error);
  }
};

/**
 * 3. Notify Membership Expiry
 */
const notifyMembershipExpiry = async (user, daysLeft) => {
    const token = user?.membership?.expoPushToken;
    if (!token) return;

    let title = 'Membership Expiring Soon! ⏳';
    let body = `Hi ${user.fullName}, your membership expires in ${daysLeft} days. Renew now!`;
    
    if (daysLeft === 1) {
        body = `Hi ${user.fullName}, your membership expires tomorrow. Renew now!`;
    } else if (daysLeft === 0) {
        title = 'Membership Expired ❌';
        body = `Hi ${user.fullName}, your membership has expired today.`;
    }

    await sendPushNotification(token, title, body);
};

module.exports = {
  sendPushNotification,
  notifyAdminNewBooking,
  notifyUserBookingStatus,
  notifyMembershipExpiry
};