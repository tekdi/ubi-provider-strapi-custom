const express = require("express");

const { createBenefit, getBenefitDetails } = require("../controllers/benefit");
const { isAuthenticated } = require("../middleware/auth");

const router = express.Router();

// router.post("/create", createBenefit);
router.post("/create", isAuthenticated, createBenefit);

router.get("/getBenefit/:documentId", getBenefitDetails);
// router.get("/getBenefit/:documentId", isAuthenticated, getBenefitDetails);

module.exports = router;
