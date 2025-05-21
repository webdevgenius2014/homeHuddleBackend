const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const Role = require("../models/Role");
const Family = require("../models/Family");
const OTP = require("../models/OTP");
const { sendOTPEmail, sendResetOTPEmail } = require("../utils/emailService");
const {
  responseOnSuccess,
  responseOnFailure,
  HTTP_STATUS,
} = require("../helpers/responseHelper");

/**
 * Generate JWT access token
 * @param {Object} user - User object
 * @returns {String} JWT token
 */
const generateAccessToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || "7d" }
  );
};

/**
 * Generate JWT refresh token
 * @param {Object} user - User object
 * @returns {String} JWT refresh token
 */
const generateRefreshToken = (user) => {
  return jwt.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || "7d",
  });
};

/**
 * Register Parent - Request OTP
 * @route POST /api/v1/auth/register/parent/request
 */
const registerParentRequest = async (req, res) => {
  try {
    const { name, email, familyName } = req.body;

    // Validate request
    if (!name || !email || !familyName) {
      return responseOnFailure(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Please provide all required fields: name, email, and familyName"
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return responseOnFailure(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Please provide a valid email address"
      );
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return responseOnFailure(
        res,
        HTTP_STATUS.CONFLICT,
        "Email already registered"
      );
    }

    // Get Parent role
    const parentRole = await Role.findOne({ name: "Parent" });
    if (!parentRole) {
      return responseOnFailure(
        res,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        "Parent role not found"
      );
    }

    // Create family
    const family = await Family.create({
      name: familyName,
      code: crypto.randomBytes(4).toString("hex").toUpperCase(),
    });

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await OTP.create({
      email,
      name,
      otp,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
    });

    // Send OTP email
    await sendOTPEmail({ name, email }, otp);

    return responseOnSuccess(
      res,
      HTTP_STATUS.OK,
      "OTP sent to email. Please verify to complete registration.",
      {
        email,
        familyId: family._id,
      }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return responseOnFailure(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Registration failed",
      { message: error.message }
    );
  }
};

/**
 * Register Parent - Verify OTP
 * @route POST /api/v1/auth/register/parent/verify
 */
const registerParentVerify = async (req, res) => {
  try {
    const { email, otp, familyId } = req.body;

    // Validate request
    if (!email || !otp || !familyId) {
      return responseOnFailure(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Please provide email, OTP, and familyId"
      );
    }

    // Find OTP record
    const otpRecord = await OTP.findOne({ email, otp });
    if (!otpRecord || otpRecord.expiresAt < Date.now()) {
      return responseOnFailure(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Invalid or expired OTP"
      );
    }

    // Get Parent role
    const parentRole = await Role.findOne({ name: "Parent" });
    if (!parentRole) {
      return responseOnFailure(
        res,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        "Parent role not found"
      );
    }

    // Create user
    const user = await User.create({
      name: otpRecord.name, // Fetch name from OTP record
      email,
      familyId,
      role: parentRole._id,
      isPremium: false,
      emailVerified: true,
    });

    // Delete OTP record
    await OTP.deleteOne({ email, otp });

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Save refresh token
    user.refreshToken = refreshToken;
    await user.save();

    // Set refresh token cookie
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    };
    res.cookie("refreshToken", refreshToken, cookieOptions);

    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      familyId: user.familyId,
      role: user.role,
    };

    return responseOnSuccess(
      res,
      HTTP_STATUS.CREATED,
      "Registration successful",
      {
        user: userData,
        accessToken,
        tokenType: "Bearer",
        expiresIn: process.env.JWT_EXPIRE || "7d",
      }
    );
  } catch (error) {
    console.error("Verification error:", error);
    return responseOnFailure(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Verification failed",
      { message: error.message }
    );
  }
};

/**
 * Login - Request OTP
 * @route POST /api/v1/auth/login/request
 */
const loginRequest = async (req, res) => {
  try {
    const { email } = req.body;

    // Validate request
    if (!email) {
      return responseOnFailure(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Please provide email"
      );
    }

    // Find user by email
    const user = await User.findOne({ email }).populate("role");
    if (!user || user.role.name !== "Parent") {
      return responseOnFailure(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "No parent account found with this email"
      );
    }

    // Check if email is verified
    if (!user.emailVerified) {
      return responseOnFailure(
        res,
        HTTP_STATUS.FORBIDDEN,
        "Please verify your email before logging in"
      );
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await OTP.create({
      email,
      name: user.name,
      otp,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
    });

    // Send OTP email
    await sendOTPEmail(user, otp);

    return responseOnSuccess(res, HTTP_STATUS.OK, "OTP sent to email", {
      email,
    });
  } catch (error) {
    console.error("Login request error:", error);
    return responseOnFailure(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Login request failed",
      { message: error.message }
    );
  }
};

/**
 * Login - Verify OTP
 * @route POST /api/v1/auth/login/verify
 */
const loginVerify = async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Validate request
    if (!email || !otp) {
      return responseOnFailure(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Please provide email and OTP"
      );
    }

    // Find OTP record
    const otpRecord = await OTP.findOne({ email, otp });
    if (!otpRecord || otpRecord.expiresAt < Date.now()) {
      return responseOnFailure(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Invalid or expired OTP"
      );
    }

    // Find user
    const user = await User.findOne({ email }).populate("role");
    if (!user || user.role.name !== "Parent") {
      return responseOnFailure(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "No parent account found with this email"
      );
    }

    // Check if email is verified
    if (!user.emailVerified) {
      return responseOnFailure(
        res,
        HTTP_STATUS.FORBIDDEN,
        "Please verify your email before logging in"
      );
    }

    // Delete OTP record
    await OTP.deleteOne({ email, otp });

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Save refresh token
    user.refreshToken = refreshToken;
    await user.save();

    // Set refresh token cookie
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    };
    res.cookie("refreshToken", refreshToken, cookieOptions);

    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      familyId: user.familyId,
      role: user.role,
    };

    return responseOnSuccess(res, HTTP_STATUS.OK, "Login successful", {
      user: userData,
      accessToken,
      tokenType: "Bearer",
      expiresIn: process.env.JWT_EXPIRE || "7d",
    });
  } catch (error) {
    console.error("Login verify error:", error);
    return responseOnFailure(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Login failed",
      { message: error.message }
    );
  }
};

/**
 * Resend OTP for email verification
 * @route POST /api/v1/auth/resend-verification
 */
const resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;

    // Validate request
    if (!email) {
      return responseOnFailure(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Please provide your email address"
      );
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return responseOnFailure(
        res,
        HTTP_STATUS.NOT_FOUND,
        "No account found with this email"
      );
    }

    // Check if email is already verified
    if (user.emailVerified) {
      return responseOnFailure(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Email is already verified"
      );
    }

    // Generate new OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await OTP.create({
      email,
      name: user.name,
      otp,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
    });

    // Send OTP email
    await sendOTPEmail(user, otp);

    return responseOnSuccess(
      res,
      HTTP_STATUS.OK,
      "Verification OTP resent successfully. Please check your email.",
      {
        user: {
          id: user._id,
          email: user.email,
        },
      }
    );
  } catch (error) {
    console.error("Resend verification OTP error:", error);
    return responseOnFailure(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to resend verification OTP",
      { message: error.message }
    );
  }
};

/**
 * Forgot Password - Send reset OTP
 * @route POST /api/v1/auth/forgot-password
 */
// const forgotPassword = async (req, res) => {
//   try {
//     const { email } = req.body;

//     // Validate request
//     if (!email) {
//       return responseOnFailure(
//         res,
//         HTTP_STATUS.BAD_REQUEST,
//         "Please provide your email address"
//       );
//     }

//     // Find user by email
//     const user = await User.findOne({ email }).populate("role");
//     if (!user || user.role.name !== "Parent") {
//       return responseOnSuccess(
//         res,
//         HTTP_STATUS.OK,
//         "If an account exists with this email, a reset OTP has been sent."
//       );
//     }

//     // Generate OTP
//     const otp = Math.floor(100000 + Math.random() * 900000).toString();
//     await OTP.create({
//       email,
//       name: user.name,
//       otp,
//       expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
//     });

//     // Send reset OTP email
//     await sendResetOTPEmail(user, otp);

//     return responseOnSuccess(
//       res,
//       HTTP_STATUS.OK,
//       "If an account exists with this email, a reset OTP has been sent."
//     );
//   } catch (error) {
//     console.error("Forgot password error:", error);
//     return responseOnFailure(
//       res,
//       HTTP_STATUS.INTERNAL_SERVER_ERROR,
//       "Failed to process reset OTP request",
//       { message: error.message }
//     );
//   }
// };

/**
 * Reset Password - Verify OTP
 * @route POST /api/v1/auth/reset-password
 */
// const resetPassword = async (req, res) => {
//   try {
//     const { email, otp } = req.body;

//     // Validate request
//     if (!email || !otp) {
//       return responseOnFailure(
//         res,
//         HTTP_STATUS.BAD_REQUEST,
//         "Please provide email and OTP"
//       );
//     }

//     // Find OTP record
//     const otpRecord = await OTP.findOne({ email, otp });
//     if (!otpRecord || otpRecord.expiresAt < Date.now()) {
//       return responseOnFailure(
//         res,
//         HTTP_STATUS.BAD_REQUEST,
//         "Invalid or expired OTP"
//       );
//     }

//     // Find user
//     const user = await User.findOne({ email }).populate("role");
//     if (!user || user.role.name !== "Parent") {
//       return responseOnFailure(
//         res,
//         HTTP_STATUS.BAD_REQUEST,
//         "No parent account found with this email"
//       );
//     }

//     // Delete OTP record
//     await OTP.deleteOne({ email, otp });

//     // Generate tokens
//     const accessToken = generateAccessToken(user);
//     const refreshToken = generateRefreshToken(user);

//     // Save refresh token
//     user.refreshToken = refreshToken;
//     await user.save();

//     // Set refresh token cookie
//     const cookieOptions = {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === "production",
//       sameSite: "strict",
//       maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
//     };
//     res.cookie("refreshToken", refreshToken, cookieOptions);

//     const userData = {
//       id: user._id,
//       name: user.name,
//       email: user.email,
//       familyId: user.familyId,
//       role: user.role,
//     };

//     return responseOnSuccess(res, HTTP_STATUS.OK, "Access reset successful", {
//       user: userData,
//       accessToken,
//       tokenType: "Bearer",
//       expiresIn: process.env.JWT_EXPIRE || "7d",
//     });
//   } catch (error) {
//     console.error("Reset access error:", error);
//     return responseOnFailure(
//       res,
//       HTTP_STATUS.INTERNAL_SERVER_ERROR,
//       "Failed to reset access",
//       { message: error.message }
//     );
//   }
// };

/**
 * Refresh access token using refresh token
 * @route POST /api/v1/auth/refresh-token
 */
const refreshToken = async (req, res) => {
  try {
    // Get refresh token from cookie or body
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
      return responseOnFailure(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Refresh token is required"
      );
    }

    // Find user by refresh token
    const user = await User.findOne({ refreshToken }).populate("role");
    if (!user) {
      return responseOnFailure(
        res,
        HTTP_STATUS.UNAUTHORIZED,
        "Invalid refresh token"
      );
    }

    // Verify refresh token
    try {
      jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (error) {
      return responseOnFailure(
        res,
        HTTP_STATUS.UNAUTHORIZED,
        "Invalid or expired refresh token"
      );
    }

    // Check user status
    if (!user.emailVerified) {
      return responseOnFailure(
        res,
        HTTP_STATUS.FORBIDDEN,
        "Email not verified"
      );
    }

    // Generate new tokens
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    // Update refresh token in database
    user.refreshToken = newRefreshToken;
    await user.save();

    // Set new refresh token cookie
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    };
    res.cookie("refreshToken", newRefreshToken, cookieOptions);

    return responseOnSuccess(
      res,
      HTTP_STATUS.OK,
      "Token refreshed successfully",
      {
        accessToken: newAccessToken,
        tokenType: "Bearer",
        expiresIn: process.env.JWT_EXPIRE || "7d",
      }
    );
  } catch (error) {
    console.error("Refresh token error:", error);
    return responseOnFailure(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Token refresh failed",
      { message: error.message }
    );
  }
};

/**
 * Logout - Invalidate refresh token
 * @route POST /api/v1/auth/logout
 */
const logout = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    let accessToken;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      accessToken = authHeader.split(" ")[1];
    }

    if (!accessToken) {
      return responseOnFailure(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Access token is required"
      );
    }

    // Decode access token (allow expired tokens)
    let decoded;
    try {
      decoded = jwt.verify(accessToken, process.env.JWT_SECRET, {
        ignoreExpiration: true,
      });
    } catch (error) {
      return responseOnFailure(
        res,
        HTTP_STATUS.UNAUTHORIZED,
        `Invalid access token: ${error.message}`
      );
    }

    // Add access token to blacklist cookie
    let blockedTokens = req.cookies.blockedTokens || [];
    blockedTokens.push(accessToken);

    res.cookie("blockedTokens", JSON.stringify(blockedTokens), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    // Clear refresh token
    const user = await User.findByIdAndUpdate(
      decoded.id,
      { refreshToken: null },
      { new: true }
    );
    if (!user) {
      return responseOnFailure(res, HTTP_STATUS.NOT_FOUND, "User not found");
    }

    // Clear refresh token cookie
    res.clearCookie("refreshToken");

    return responseOnSuccess(
      res,
      HTTP_STATUS.OK,
      "Logged out successfully",
      null
    );
  } catch (error) {
    console.error("Logout error:", error);
    return responseOnFailure(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Logout failed",
      { message: error.message }
    );
  }
};

module.exports = {
  registerParentRequest,
  registerParentVerify,
  loginRequest,
  loginVerify,
  resendVerificationEmail,

  refreshToken,
  logout,
  generateAccessToken,
  generateRefreshToken,
};
