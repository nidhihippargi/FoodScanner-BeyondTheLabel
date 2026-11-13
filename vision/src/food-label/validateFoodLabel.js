/**
 * Structural and plausibility checks for extracted label data.
 * This does not certify regulatory compliance, nutritional accuracy or safety.
 */
function validateFoodLabel(input) {
  const parsedData = input && typeof input === "object" && input.parsedData
    ? input.parsedData
    : input;

  if (!parsedData || typeof parsedData !== "object" || Array.isArray(parsedData)) {
    return {
      valid: false,
      needsReview: true,
      errors: ["Food-label data must be an object."],
      warnings: [],
      checks: []
    };
  }

  const errors = [];
  const warnings = [];
  const checks = [];

  const ingredientsValid = Array.isArray(parsedData.ingredients) &&
    parsedData.ingredients.every(item => typeof item === "string" && item.trim());
  checks.push({ name: "ingredients_shape", passed: ingredientsValid });
  if (!ingredientsValid) errors.push("Ingredients must be an array of non-empty strings.");

  const allergensValid = Array.isArray(parsedData.allergens) &&
    parsedData.allergens.every(item => typeof item === "string" && item.trim());
  checks.push({ name: "allergens_shape", passed: allergensValid });
  if (parsedData.allergens !== undefined && !allergensValid) {
    errors.push("Allergens must be an array of non-empty strings.");
  }

  const nutrition = parsedData.nutrition;
  const nutritionValid = nutrition === undefined ||
    (nutrition && typeof nutrition === "object" && !Array.isArray(nutrition));
  checks.push({ name: "nutrition_shape", passed: Boolean(nutritionValid) });
  if (!nutritionValid) errors.push("Normalized nutrition must be an object.");

  if (nutritionValid && nutrition) {
    for (const [key, value] of Object.entries(nutrition)) {
      if (value !== null && (!Number.isFinite(value) || value < 0)) {
        errors.push(`Nutrition field '${key}' must be a non-negative finite number or null.`);
      }
    }
  }

  const productNamePresent = typeof parsedData.productName === "string" && parsedData.productName.trim().length > 0;
  checks.push({ name: "product_name_present", passed: productNamePresent });
  if (!productNamePresent) warnings.push("Product name is missing; verify the label or OCR output.");

  if (!ingredientsValid || parsedData.ingredients.length === 0) {
    warnings.push("Ingredient information is missing or incomplete.");
  }

  if (!allergensValid || !parsedData.allergens || parsedData.allergens.length === 0) {
    warnings.push("No allergens were extracted. Confirm the package's allergen statement manually.");
  }

  if (nutritionValid && (!nutrition || Object.values(nutrition).every(value => value === null))) {
    warnings.push("No normalized nutrition values are available.");
  }

  const rawBasis = parsedData.nutritionBasis;
  const basis = rawBasis === undefined || rawBasis === null || rawBasis === ""
    ? "unknown"
    : rawBasis;
  const validBasis = ["per_100g", "per_serving", "unknown"].includes(basis);
  checks.push({ name: "nutrition_basis_valid", passed: validBasis });
  if (!validBasis) {
    errors.push("nutritionBasis must be 'per_100g', 'per_serving' or 'unknown'.");
  }

  const basisKnown = validBasis && basis !== "unknown";
  checks.push({ name: "nutrition_basis_known", passed: basisKnown });
  if (basis === "unknown") {
    warnings.push("Nutrition basis is unknown; do not compare values until the basis is confirmed.");
  }

  const rawNutrition = parsedData.rawNutrition && typeof parsedData.rawNutrition === "object"
    ? parsedData.rawNutrition
    : {};
  const fatGrams = toGrams(rawNutrition.fat);
  const proteinGrams = toGrams(rawNutrition.protein);
  const carbohydrateGrams = toGrams(rawNutrition.carbohydrates);
  const saturatedFatGrams = toGrams(rawNutrition.saturatedFat);
  const sugarGrams = toGrams(rawNutrition.sugars);

  if (fatGrams !== null && saturatedFatGrams !== null && saturatedFatGrams > fatGrams) {
    warnings.push("Saturated fat is greater than total fat; verify the extracted values and units.");
  }
  if (carbohydrateGrams !== null && sugarGrams !== null && sugarGrams > carbohydrateGrams) {
    warnings.push("Sugars are greater than total carbohydrates; verify the extracted values and units.");
  }

  if (fatGrams !== null && proteinGrams !== null && carbohydrateGrams !== null) {
    const macroTotal = fatGrams + proteinGrams + carbohydrateGrams;
    if (basis === "per_100g" && macroTotal > 100) {
      warnings.push("Fat, protein and carbohydrate total more than 100 g per 100 g; verify OCR values and units.");
    }
    if (basis === "per_serving") {
      const servingGrams = parseServingGrams(parsedData.servingSize);
      if (servingGrams !== null && macroTotal > servingGrams) {
        warnings.push("Fat, protein and carbohydrate exceed the stated serving size; verify OCR values and units.");
      }
    }
  }

  return {
    valid: errors.length === 0,
    needsReview: errors.length > 0 || warnings.length > 0,
    errors,
    warnings,
    checks
  };
}

function toGrams(nutritionValue) {
  if (!nutritionValue || !Number.isFinite(nutritionValue.value)) return null;
  const unit = typeof nutritionValue.unit === "string" ? nutritionValue.unit.toLowerCase() : "";
  if (unit === "g") return nutritionValue.value;
  if (unit === "mg") return nutritionValue.value / 1000;
  return null;
}

function parseServingGrams(value) {
  if (typeof value !== "string") return null;
  const match = value.match(/^\s*(\d+(?:[.,]\d+)?)\s*(g|gram|grams)\b/i);
  return match ? Number(match[1].replace(",", ".")) : null;
}

module.exports = { validateFoodLabel };
