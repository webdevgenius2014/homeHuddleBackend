// src/routes/index.js
const express = require("express");
const router = express.Router();
const authRoutes = require("./authRoutes");
const familyRoutes = require("./familyRoutes");

router.use("/auth", authRoutes);
router.use("/family", familyRoutes);

module.exports = router;
