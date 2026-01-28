const User = require('../models/User');

/**
 * CORE: Sends a push notification via Expo API
 */
const sendPushNotification = async (pushToken, title, body, data = {}) => {
  if (!pushToken) return;
  
  // console.log(`🚀 [DEBUG] Sending to: ${pushToken}`); 
  
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

    // Only log if there is an error to keep console clean
    const result = await response.json();
    if (result.data?.status === 'error') {
        console.error('❌ Expo Error:', result.data.message);
    }
  } catch (error) {
    console.error(`❌ Error sending push notification: ${error}`);
  }
};

// ===============================================
// --- 1. ADMIN NOTIFICATIONS ---
// ===============================================

/**
 * Notifies all Admins when a new booking is created (Optimized: Parallel)
 */
const notifyAdminNewBooking = async (booking) => {
  if (!booking) return;
  try {
    const admins = await User.find({ role: 'admin' });
    
    // Send to all admins simultaneously using Promise.all
    const notifications = admins.map(admin => {
        const token = admin.membership?.expoPushToken;
        if (token) {
            return sendPushNotification(
                token,
                'New Booking Request 🏸',
                `Booking ${booking.bookingId} is pending approval.`,
                { screen: 'AdminBookings', bookingId: booking._id }
            );
        }
    });

    await Promise.all(notifications);

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

    const promises = [];

    // 1. Notify the Creator (Captain/Player)
    if (player?.membership?.expoPushToken) {
      promises.push(
          sendPushNotification(player.membership.expoPushToken, title, body, { 
            screen: 'BookingDetails', 
            bookingId: booking._id 
          })
      );
    }

    // 2. Notify All Admins (Parallel)
    admins.forEach(admin => {
      if (admin.membership?.expoPushToken) {
        promises.push(
            sendPushNotification(
                admin.membership.expoPushToken, 
                'Admin: Booking Paid', 
                `Booking ${booking.bookingId} status updated to Paid.`
            )
        );
      }
    });

    await Promise.all(promises);

  } catch (error) {
    console.error('Error in multi-party booking notification:', error);
  }
};

/**
 * Standard status update notification
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

  let title = 'Membership Reminder 🏸';
  let body = `Hi ${user.fullName}, your membership expires in ${daysLeft} days.`;

  // Custom messages based on urgency
  if (daysLeft === 5) {
    title = 'Membership Expiring Soon ⏳';
    body = `Hi ${user.fullName}, just a heads up! You have 5 days left on your membership.`;
  } else if (daysLeft === 3) {
    title = 'Action Required: 3 Days Left ⚠️';
    body = `Hi ${user.fullName}, don't lose access! Your membership expires in 3 days.`;
  } else if (daysLeft === 1) {
    title = 'Final Warning: Expires Tomorrow! ⏰';
    body = `Hi ${user.fullName}, this is your last day to renew before expiry!`;
  } else if (daysLeft <= 0) {
    title = 'Membership Expired ❌';
    body = `Hi ${user.fullName}, your membership has expired. Renew now to book courts.`;
  }

  // Send the notification
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