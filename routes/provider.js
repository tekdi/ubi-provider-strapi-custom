const express = require("express");
const {
  registerProvider,
  otpForReg,
  otpForLog,
  login,
} = require("../controllers/provider");
const router = express.Router();

router.post("/sendOtpForReg", otpForReg);
router.post("/register", registerProvider);
router.post("/sendOtpForLog", otpForLog);
router.post("/login", login);

module.exports = router;
