// src/routes/index.js
const express = require("express");
const router = express.Router();

router.use("/test", async (req, res) => {
  return "Hello test";
});

module.exports = router;
