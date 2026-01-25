const nodemailer = require('nodemailer');
require('dotenv').config(); // Ensure this is at the top!

// Use 'service: gmail' just like the test file that worked
const transporter = nodemailer.createTransport({
  service: 'gmail', 
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS, // This reads from .env
  },
});

const sendEmailOtp = async (email, otp) => {
  const mailOptions = {
    from: `"Badminton App" <${process.env.EMAIL_FROM}>`,
    to: email,
    subject: 'Your Login Verification Code',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Welcome Back!</h2>
        <p>Your verification code is:</p>
        <h1>${otp}</h1>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('❌ Email Error:', error);
    return false;
  }
};

module.exports = { sendEmailOtp };