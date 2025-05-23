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
const sendInvitationEmail = async (recipient, family, inviter, roleName) => {
  const joinUrl = `${process.env.FRONTEND_URL}/join-family?code=${family.code}`;
  const mailOptions = {
    from: `"HomeHuddle" <${process.env.TRANSPORT_USER}>`,
    to: recipient.email,
    subject: `Join ${family.name} on HomeHuddle`,
    html: `
      <h2>Hello ${recipient.name}!</h2>
      <p>You've been invited by ${inviter.name} to join the ${family.name} family on HomeHuddle as a ${roleName}.</p>
      <p>Use the family code: <strong>${family.code}</strong> or click the link below to join:</p>
      <a href="${joinUrl}" style="padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">
        Join Family
      </a>
      <p>This code is valid for 24 hours.</p>
      <p>If you didn't expect this invitation, please ignore this email.</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Invitation email sent to ${recipient.email}`);
  } catch (error) {
    console.error("Error sending invitation email:", error);
    throw new Error("Failed to send invitation email");
  }
};

module.exports = { sendOTPEmail, sendResetOTPEmail, sendInvitationEmail };
