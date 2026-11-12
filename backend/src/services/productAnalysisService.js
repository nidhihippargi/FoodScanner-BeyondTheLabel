const { detectSugarAliases } = require("./ingredientService");
const { normalizeNutrition } = require("./nutritionService");
const { verifyClaim } = require("./claimService");
const { analyzePersonalization } = require("./personalizationService");
const { calculateProductScore } = require("./scoringService");

function analyzeProduct(product) {
    if (!product || typeof product !== "object" || Array.isArray(product)) {
        throw new Error("Valid product information is required.");
    }

    const {
        productName = "Unknown Product",
        ingredients,
        nutrition,
        servingSize,
        claims = [],
        preferences = []
    } = product;

    if (typeof ingredients !== "string" || !ingredients.trim()) {
        throw new Error("A valid ingredient list is required.");
    }

    if (!Array.isArray(claims)) {
        throw new Error("Claims must be an array.");
    }

    if (!Array.isArray(preferences)) {
        throw new Error("Preferences must be an array.");
    }

    // 1. Sugar alias detection
    const ingredientAnalysis = detectSugarAliases(ingredients);

    // 2. Nutritional normalization
    let nutritionAnalysis = null;

    if (nutrition !== undefined && nutrition !== null) {
        if (!servingSize) {
            throw new Error("Serving size is required for nutrition normalization.");
        }

        nutritionAnalysis = normalizeNutrition(nutrition, servingSize, product.nutritionBasis || "per-serving");
    }

    // 3. Prepare normalized nutrition for other services
    const sugarValue = nutritionAnalysis?.values?.sugar;

    const ruleNutrition = {
        sugar: sugarValue?.unit === "g"
            ? sugarValue.value
            : undefined,

        // Claim verification currently expects sugar per 100g.
        sugarPer100g:
            nutritionAnalysis?.basis === "per 100g" &&
            sugarValue?.unit === "g"
                ? sugarValue.value
                : undefined
    };

    // 4. Front-of-pack claim verification
    const claimAnalysis = claims.map(claim =>
        verifyClaim(claim, ingredients, ruleNutrition)
    );

    // 5. Personalization
    const personalizationAnalysis = analyzePersonalization(
        ingredients,
        ruleNutrition,
        preferences
    );

    // 6. Calculate the overall product score using the four module outputs
    const scoringAnalysis = calculateProductScore({
        ingredients: ingredientAnalysis,
        nutrition: nutritionAnalysis,
        claims: claimAnalysis
    });

    // 7. Combined response
    return {
        success: true,

        product: {
            name: productName
        },

        analysis: {
            ingredients: ingredientAnalysis,
            nutrition: nutritionAnalysis,
            claims: claimAnalysis,
            personalization: personalizationAnalysis,
            scoring: scoringAnalysis
        }
    };
}

module.exports = { analyzeProduct };
