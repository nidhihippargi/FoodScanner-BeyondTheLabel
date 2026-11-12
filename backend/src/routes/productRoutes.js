const express = require("express");
const router = express.Router();

const {
    createProduct,
    getProductByBarcode
} = require("../controllers/productController");

// Save a product
router.post("/", createProduct);

// Get product using barcode
router.get("/:barcode", getProductByBarcode);

module.exports = router;