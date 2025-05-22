const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

router.post("/register/parent/request", authController.registerParentRequest);
router.post("/register/parent/verify", authController.registerParentVerify);
router.post("/login/request", authController.loginRequest);
router.post("/login/verify", authController.loginVerify);
router.post("/resend-verification", authController.resendVerificationEmail);
// router.post("/reset-password", authController.resetPassword);
router.post("/refresh-token", authController.refreshToken);
router.post("/logout", authController.logout);

module.exports = router;
