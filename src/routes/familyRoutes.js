const express = require("express");
const router = express.Router();
const familyController = require("../controllers/familyController");
const { protect, restrictTo } = require("../middleware/authMiddleware");

router.use(protect); // All routes require authentication

router.post("/invite", restrictTo("Parent"), familyController.inviteUser);
router.patch("/update-role", restrictTo("Parent"), familyController.updateRole);
router.delete(
  "/remove-member",
  restrictTo("Parent"),
  familyController.removeMember
);
router.get("/members", restrictTo("Parent"), familyController.listMembers);

// Public routes for joining
router.post("/join/request", familyController.joinFamilyRequest);
router.post("/join/verify", familyController.joinFamilyVerify);

module.exports = router;
