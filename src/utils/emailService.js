const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: process.env.TRANSPORT_SERVICE,
  auth: {
    user: process.env.TRANSPORT_USER,
    pass: process.env.TRANSPORT_PASSWORD,
  },
});

const sendOTPEmail = async (user, otp) => {
  const mailOptions = {
    from: `"HomeHuddle" <${process.env.TRANSPORT_USER}>`,
    to: user.email,
    subject: "Your HomeHuddle OTP Code",
    html: `
      <h2>Hello ${user.name}!</h2>
      <p>Your OTP code for HomeHuddle is: <strong>${otp}</strong></p>
      <p>This code will expire in 10 minutes.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`OTP email sent to ${user.email}`);
  } catch (error) {
    console.error("Error sending OTP email:", error);
    throw new Error("Failed to send OTP email");
  }
};

const sendResetOTPEmail = async (user, otp) => {
  const mailOptions = {
    from: `"HomeHuddle" <${process.env.TRANSPORT_USER}>`,
    to: user.email,
    subject: "HomeHuddle Password Reset OTP",
    html: `
      <h2>Hello ${user.name}!</h2>
      <p>Your OTP code to reset your HomeHuddle account access is: <strong>${otp}</strong></p>
      <p>This code will expire in 10 minutes.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Reset OTP email sent to ${user.email}`);
  } catch (error) {
    console.error("Error sending reset OTP email:", error);
    throw new Error("Failed to send reset OTP email");
  }
};

module.exports = { sendOTPEmail, sendResetOTPEmail };
