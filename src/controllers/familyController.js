const mongoose = require("mongoose");
const User = require("../models/User");
const Role = require("../models/Role");
const Family = require("../models/Family");
const OTP = require("../models/OTP");
const {sendOTPEmail,     sendInvitationEmail } = require("../utils/emailService");
const {
  responseOnSuccess,
  responseOnFailure,
  HTTP_STATUS,
} = require("../helpers/responseHelper");

/**
 * Invite a user to join a family
 * @route POST /api/v1/family/invite
 * @access Private (Parent only)
 */
exports.inviteUser = async (req, res) => {
  try {
    const { email, name, roleName } = req.body;
    const inviter = req.user;

    // Validate request
    if (!email || !name || !roleName) {
      return responseOnFailure(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Please provide email, name, and roleName"
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

    // Validate role
    const role = await Role.findOne({ name: roleName });
    if (!role || !["Parent", "Child"].includes(roleName)) {
      return responseOnFailure(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Invalid role. Must be Parent or Child"
      );
    }

    // Check if user is already in the family
    const family = await Family.findById(inviter.familyId);
    if (!family) {
      return responseOnFailure(res, HTTP_STATUS.NOT_FOUND, "Family not found");
    }

    const existingUser = await User.findOne({
      email,
      familyId: inviter.familyId,
    });
    if (existingUser) {
      return responseOnFailure(
        res,
        HTTP_STATUS.CONFLICT,
        "User is already a member of this family"
      );
    }

    // Send invitation email
    await sendInvitationEmail({ email, name }, family, inviter, roleName);

    // Store invitation in OTP model for role assignment
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await OTP.create({
      email,
      name,
      otp,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      metadata: { familyId: inviter.familyId, roleId: role._id },
    });

    return responseOnSuccess(
      res,
      HTTP_STATUS.OK,
      "Invitation sent successfully",
      { email, roleName }
    );
  } catch (error) {
    console.error("Invite user error:", error);
    return responseOnFailure(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to send invitation",
      { message: error.message }
    );
  }
};

/**
 * Join a family using code (for new or existing users)
 * @route POST /api/v1/family/join/request
 * @access Public
 */
exports.joinFamilyRequest = async (req, res) => {
  try {
    const { email, name, code } = req.body;

    // Validate request
    if (!email || !name || !code) {
      return responseOnFailure(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Please provide email, name, and family code"
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

    // Find family by code
    const family = await Family.findOne({ code });
    if (!family) {
      return responseOnFailure(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Invalid family code"
      );
    }

    // Check if user is already in the family
    const existingUser = await User.findOne({ email, familyId: family._id });
    if (existingUser) {
      return responseOnFailure(
        res,
        HTTP_STATUS.CONFLICT,
        "You are already a member of this family"
      );
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await OTP.create({
      email,
      name,
      otp,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
      metadata: { familyId: family._id },
    });

    // Send OTP email
    await sendOTPEmail({ email, name }, otp);

    return responseOnSuccess(
      res,
      HTTP_STATUS.OK,
      "OTP sent to email. Please verify to join the family.",
      { email, familyId: family._id }
    );
  } catch (error) {
    console.error("Join family request error:", error);
    return responseOnFailure(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to process join request",
      { message: error.message }
    );
  }
};

/**
 * Verify OTP to join a family
 * @route POST /api/v1/family/join/verify
 * @access Public
 */
exports.joinFamilyVerify = async (req, res) => {
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

    // Find family
    const family = await Family.findById(familyId);
    if (!family) {
      return responseOnFailure(res, HTTP_STATUS.NOT_FOUND, "Family not found");
    }

    // Check if user exists
    let user = await User.findOne({ email });
    let roleId = otpRecord.metadata?.roleId;

    if (!user) {
      // New user: assign Child role by default unless specified in OTP metadata
      if (!roleId) {
        const childRole = await Role.findOne({ name: "Child" });
        if (!childRole) {
          return responseOnFailure(
            res,
            HTTP_STATUS.INTERNAL_SERVER_ERROR,
            "Child role not found"
          );
        }
        roleId = childRole._id;
      }

      user = await User.create({
        name: otpRecord.name,
        email,
        familyId,
        role: roleId,
        isPremium: false,
        emailVerified: true,
      });
    } else {
      // Existing user: update familyId and role if specified
      if (user.familyId) {
        return responseOnFailure(
          res,
          HTTP_STATUS.CONFLICT,
          "User is already part of another family"
        );
      }
      user.familyId = familyId;
      if (roleId) {
        user.role = roleId;
      }
      await user.save();
    }

    // Add user to family members
    family.members.push(user._id);
    await family.save();

    // Delete OTP record
    await OTP.deleteOne({ email, otp });

    // Generate tokens
    const accessToken = require("./authController").generateAccessToken(user);
    const refreshToken = require("./authController").generateRefreshToken(user);

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
      HTTP_STATUS.OK,
      "Successfully joined family",
      {
        user: userData,
        accessToken,
        tokenType: "Bearer",
        expiresIn: process.env.JWT_EXPIRE || "7d",
      }
    );
  } catch (error) {
    console.error("Join family verify error:", error);
    return responseOnFailure(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to join family",
      { message: error.message }
    );
  }
};

/**
 * Update a family member's role
 * @route PATCH /api/v1/family/update-role
 * @access Private (Parent only, Premium)
 */
exports.updateRole = async (req, res) => {
  try {
    const { userId, roleName } = req.body;
    const parent = req.user;

    // Validate request
    if (!userId || !roleName) {
      return responseOnFailure(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Please provide userId and roleName"
      );
    }

    // Check if user is premium
    if (!parent.isPremium) {
      return responseOnFailure(
        res,
        HTTP_STATUS.FORBIDDEN,
        "Role customization requires a premium account"
      );
    }

    // Validate role
    const role = await Role.findOne({ name: roleName });
    if (!role || !["Parent", "Child"].includes(roleName)) {
      return responseOnFailure(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Invalid role. Must be Parent or Child"
      );
    }

    // Find family
    const family = await Family.findById(parent.familyId);
    if (!family) {
      return responseOnFailure(res, HTTP_STATUS.NOT_FOUND, "Family not found");
    }

    // Check if user is a family member
    if (!family.members.includes(userId)) {
      return responseOnFailure(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "User is not a member of this family"
      );
    }

    // Update user's role
    const user = await User.findById(userId);
    if (!user) {
      return responseOnFailure(res, HTTP_STATUS.NOT_FOUND, "User not found");
    }

    user.role = role._id;
    await user.save();

    return responseOnSuccess(res, HTTP_STATUS.OK, "Role updated successfully", {
      userId,
      roleName,
    });
  } catch (error) {
    console.error("Update role bulk error:", error);
    return responseOnFailure(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to update role",
      { message: error.message }
    );
  }
};

/**
 * Remove a family member
 * @route DELETE /api/v1/family/remove-member
 * @access Private (Parent only)
 */
exports.removeMember = async (req, res) => {
  try {
    const { userId } = req.body;
    const parent = req.user;

    // Validate request
    if (!userId) {
      return responseOnFailure(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Please provide userId"
      );
    }

    // Prevent removing self
    if (userId.toString() === parent._id.toString()) {
      return responseOnFailure(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Cannot remove yourself from the family"
      );
    }

    // Find family
    const family = await Family.findById(parent.familyId);
    if (!family) {
      return responseOnFailure(res, HTTP_STATUS.NOT_FOUND, "Family not found");
    }

    // Check if user is a family member
    if (!family.members.includes(userId)) {
      return responseOnFailure(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "User is not a member of this family"
      );
    }

    // Remove user from family
    family.members = family.members.filter(
      (member) => member.toString() !== userId.toString()
    );
    await family.save();

    // delete user's familyId
    const user = await User.deleteOne(userId);
    // if (user) {
    //   user.familyId = null;
    //   user.role = null;
    //   user.refreshToken = null;
    //   await user.save();
    // }

    return responseOnSuccess(
      res,
      HTTP_STATUS.OK,
      "Member removed successfully",
      { userId }
    );
  } catch (error) {
    console.error("Remove member error:", error);
    return responseOnFailure(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to remove member",
      { message: error.message }
    );
  }
};

/**
 * List family members
 * @route GET /api/v1/family/members
 * @access Private (Parent only)
 */
exports.listMembers = async (req, res) => {
  try {
    const parent = req.user;

    // Find family with members
    const family = await Family.findById(parent.familyId).populate({
      path: "members",
      select: "name email role isPremium emailVerified",
      populate: {
        path: "role",
        select: "name",
      },
    });

    if (!family) {
      return responseOnFailure(res, HTTP_STATUS.NOT_FOUND, "Family not found");
    }

    return responseOnSuccess(
      res,
      HTTP_STATUS.OK,
      "Family members retrieved successfully",
      { members: family.members }
    );
  } catch (error) {
    console.error("List members error:", error);
    return responseOnFailure(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to retrieve family members",
      { message: error.message }
    );
  }
};
