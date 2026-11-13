const { analyzeProduct } = require("../services/productAnalysisService");

function analyzeProductController(req, res) {
    try {
        const result = analyzeProduct(req.body);
        return res.status(200).json(result);

    } catch (error) {
        const validationErrors = [
            "Valid product information is required.",
            "A valid ingredient list is required.",
            "Claims must be an array.",
            "Preferences must be an array.",
            "Serving size is required for nutrition normalization.",
            "Nutrition information is required.",
            "A valid serving size is required.",
            "Serving size must be in g or ml."
        ];

        const statusCode = validationErrors.includes(error.message)
            ? 400
            : 500;

        return res.status(statusCode).json({
            success: false,
            message: statusCode === 400
                ? error.message
                : "Internal server error."
        });
    }
}

module.exports = { analyzeProductController };