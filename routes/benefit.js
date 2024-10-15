const express = require("express");

const { createBenefit } = require("../controllers/benefit");

const router = express.Router();

router.post("/create", createBenefit);

module.exports = router;
