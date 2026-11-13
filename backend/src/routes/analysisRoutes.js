const express = require("express");
const router = express.Router();

const {
    analyzeProductController
} = require("../controllers/analysisController");

router.post("/analyze", analyzeProductController);

module.exports = router;
