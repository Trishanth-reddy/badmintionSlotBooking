const axios = require('axios');

const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY;
const MSG91_TEMPLATE_ID = process.env.MSG91_TEMPLATE_ID;

// 1. Send OTP
exports.sendRegistrationOTP = async (phone) => {
  try {
    const response = await axios.get('https://api.msg91.com/api/v5/otp', {
      params: {
        authkey: MSG91_AUTH_KEY,
        template_id: MSG91_TEMPLATE_ID,
        mobile: `91${phone}`,
        otp_length: 6,
      }
    });
    return response.data;
  } catch (error) {
    throw new Error('SMS Gateway Error');
  }
};

// 2. Verify OTP
exports.verifyRegistrationOTP = async (phone, otp) => {
  // MASTER OTP FOR DEV (Remove this when you go live)
  if (otp === '123456') return { type: 'success' };

  try {
    const response = await axios.get('https://api.msg91.com/api/v5/otp/verify', {
      params: {
        authkey: MSG91_AUTH_KEY,
        mobile: `91${phone}`,
        otp: otp
      }
    });
    return response.data;
  } catch (error) {
    return { type: 'error' };
  }
};