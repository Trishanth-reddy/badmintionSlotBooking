const User = require('../models/User');

/**
 * CORE: Sends a push notification via Expo API
 */
const sendPushNotification = async (pushToken, title, body, data = {}) => {
  if (!pushToken) return;
  
  console.log(`🚀 [DEBUG] Sending to: ${pushToken}`); 
  
  const message = {
    to: pushToken,
    sound: 'default',
    title: title,
    body: body,
    data: { 
      ...data, 
      timestamp: new Date().toISOString() 
    }, 
  };

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    console.log('🔔 Expo Receipt:', result.data?.status || result);
  } catch (error) {
    console.error(`❌ Error sending push notification: ${error}`);
  }
};

// ===============================================
// --- 1. ADMIN NOTIFICATIONS ---
// ===============================================

/**
 * Notifies all Admins when a new booking is created
 */
const notifyAdminNewBooking = async (booking) => {
  if (!booking) return;
  try {
    const admins = await User.find({ role: 'admin' });
    for (const admin of admins) {
      const token = admin.membership?.expoPushToken;
      if (token) {
        await sendPushNotification(
          token,
          'New Booking Request 🏸',
          `Booking ${booking.bookingId} is pending approval.`,
          { screen: 'AdminBookings', bookingId: booking._id }
        );
      }
    }
  } catch (error) {
    console.error('Error notifying admins:', error);
  }
};

// ===============================================
// --- 2. PLAYER & CAPTAIN NOTIFICATIONS ---
// ===============================================

/**
 * Notifies the Captain when a player sends a join request
 */
const notifyCaptainJoinRequest = async (captainId, playerName, courtName, bookingId) => {
  try {
    const captain = await User.findById(captainId);
    const token = captain?.membership?.expoPushToken;
    if (token) {
      await sendPushNotification(
        token,
        'New Join Request 👥',
        `${playerName} wants to join your match at ${courtName}.`,
        { screen: 'BookingDetails', bookingId }
      );
    }
  } catch (error) {
    console.error('Error notifying captain:', error);
  }
};

/**
 * Notifies the Player when the Captain accepts their request
 */
const notifyPlayerRequestAccepted = async (playerId, courtName, bookingId) => {
  try {
    const player = await User.findById(playerId);
    const token = player?.membership?.expoPushToken;
    if (token) {
      await sendPushNotification(
        token,
        'Request Accepted! 🎉',
        `You have been accepted for the match at ${courtName}.`,
        { screen: 'BookingDetails', bookingId }
      );
    }
  } catch (error) {
    console.error('Error notifying player:', error);
  }
};

/**
 * Notifies ALL parties (Player + Captain + Admins) when Admin confirms a booking
 */
const notifyBookingApproved = async (booking) => {
  try {
    const player = await User.findById(booking.user);
    const admins = await User.find({ role: 'admin' });

    const title = 'Booking Approved! ✅';
    const body = `Match on ${new Date(booking.date).toLocaleDateString()} is officially confirmed.`;

    // 1. Notify the Creator (Captain/Player)
    if (player?.membership?.expoPushToken) {
      await sendPushNotification(player.membership.expoPushToken, title, body, { 
        screen: 'BookingDetails', 
        bookingId: booking._id 
      });
    }

    // 2. Notify All Admins (Log confirmation)
    for (const admin of admins) {
      if (admin.membership?.expoPushToken) {
        await sendPushNotification(
          admin.membership.expoPushToken, 
          'Admin: Booking Paid', 
          `Booking ${booking.bookingId} status updated to Paid.`
        );
      }
    }
  } catch (error) {
    console.error('Error in multi-party booking notification:', error);
  }
};

/**
 * Standard status update notification (Used for cancellations/general changes)
 */
const notifyUserBookingStatus = async (booking, status) => {
  if (!booking || !booking.user) return;
  try {
    const user = await User.findById(booking.user);
    const token = user?.membership?.expoPushToken;
    if (!token) return;

    const title = status === 'Confirmed' ? 'Booking Confirmed! ✅' : 'Booking Cancelled ❌';
    const body = status === 'Confirmed' 
      ? `Your booking is confirmed. See you on court!`
      : `Your booking has been cancelled.`;
    
    await sendPushNotification(token, title, body, { screen: 'MyBookings' });
  } catch (error) {
    console.error('Error notifying user status:', error);
  }
};

// ===============================================
// --- 3. MEMBERSHIP NOTIFICATIONS ---
// ===============================================

/**
 * Notifies user of membership expiry status
 */
const notifyMembershipExpiry = async (user, daysLeft) => {
  const token = user?.membership?.expoPushToken;
  if (!token) return;

  let title = 'Membership Expiring Soon! ⏳';
  let body = `Hi ${user.fullName}, your membership expires in ${daysLeft} days. Renew now!`;
  
  if (daysLeft === 1) {
    body = `Hi ${user.fullName}, your membership expires tomorrow!`;
  } else if (daysLeft === 0) {
    title = 'Membership Expired ❌';
    body = `Hi ${user.fullName}, your membership has expired. Renew to join matches.`;
  }

  await sendPushNotification(token, title, body, { screen: 'Membership' });
};

module.exports = {
  sendPushNotification,
  notifyAdminNewBooking,
  notifyUserBookingStatus,
  notifyMembershipExpiry,
  notifyCaptainJoinRequest,
  notifyPlayerRequestAccepted,
  notifyBookingApproved
};