const { fetchProductByBarcode } = require("../services/openFoodFactsService");
const Product = require("../models/Product");

// Save a new product
async function createProduct(req, res) {
    try {
        const {
            barcode,
            productName,
            brand,
            ingredients,
            nutrition,
            servingSize,
            claims,
            source
        } = req.body;

        if (!barcode || !productName) {
            return res.status(400).json({
                success: false,
                message: "Barcode and product name are required."
            });
        }

        const product = await Product.create({
            barcode,
            productName,
            brand,
            ingredients,
            nutrition,
            servingSize,
            claims,
            source
        });

        return res.status(201).json({
            success: true,
            message: "Product saved successfully.",
            product
        });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "A product with this barcode already exists."
            });
        }

        return res.status(500).json({
            success: false,
            message: "Failed to save product.",
            error: error.message
        });
    }
}

// Retrieve a product using its barcode
async function getProductByBarcode(req, res) {
    try {
        const { barcode } = req.params;

        // 1. Check MongoDB first
        let product = await Product.findOne({ barcode });

        if (product) {
            return res.status(200).json({
                success: true,
                source: "database",
                product
            });
        }

        // 2. Search Open Food Facts
        const externalProduct = await fetchProductByBarcode(barcode);

        if (!externalProduct) {
            return res.status(404).json({
                success: false,
                message: "Product not found in our database or Open Food Facts."
            });
        }

        // 3. Save the external product in MongoDB
        product = await Product.create(externalProduct);

        // 4. Return the product
        return res.status(200).json({
            success: true,
            source: "openfoodfacts",
            product
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve product.",
            error: error.message
        });
    }
}

module.exports = {
    createProduct,
    getProductByBarcode
};