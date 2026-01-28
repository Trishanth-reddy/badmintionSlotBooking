const nodemailer = require('nodemailer');

// Create the transporter using Brevo settings from .env
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT, // Should be 587 or 2525
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER, // Your Brevo login (a08...)
    pass: process.env.EMAIL_PASS, // Your long API Key
  },
});

const sendEmailOtp = async (to, otp) => {
  try {
    const info = await transporter.sendMail({
      // ✅ This matches your verified sender settings exactly
      from: '"badminton" <strishanthreddy@gmail.com>', 
      to: to,
      subject: 'Badminton App Verification',
      text: `Your verification code is: ${otp}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Verification Code</h2>
          <p>Your code is: <b style="font-size: 24px; color: #333;">${otp}</b></p>
          <p>This code will expire in 10 minutes.</p>
        </div>
      `,
    });

    console.log("✅ Email sent: %s", info.messageId);
    return true;
  } catch (error) {
    console.error("❌ Email Error:", error);
    return false;
  }
};

module.exports = { sendEmailOtp };