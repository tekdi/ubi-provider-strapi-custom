const express = require("express");
const {
  registerProvider,
  otpForReg,
  otpForLog,
  login,
  getOverview,
} = require("../controllers/provider");
// const { isAuthenticated } = require("../middleware/auth");
const router = express.Router();

router.post("/sendOtpForReg", otpForReg);
router.post("/register", registerProvider);
router.post("/sendOtpForLog", otpForLog);
router.post("/login", login);
router.get("/getApplicationOverview/:id", getOverview);
// router.get("/getApplicationOverview/:id", isAuthenticated, getOverview);

module.exports = router;
