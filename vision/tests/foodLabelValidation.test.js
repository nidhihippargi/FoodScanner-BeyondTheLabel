const test = require("node:test");
const assert = require("node:assert/strict");
const { validateFoodLabel } = require("../src/food-label/validateFoodLabel");

test("accepts structurally valid label data", () => {
  const result = validateFoodLabel({
    productName: "Oat Bar",
    ingredients: ["Oats", "Dates"],
    allergens: ["Oats"],
    nutrition: { calories: 200, sugar: 8, sodium: 50, saturatedFat: 1, totalFat: 5, protein: 4, fiber: 3 },
    nutritionBasis: "per_serving",
    servingSize: "40 g"
  });
  assert.equal(result.valid, true);
});

test("rejects negative or non-finite normalized nutrition values", () => {
  const result = validateFoodLabel({ ingredients: [], allergens: [], nutrition: { sugar: -1 } });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(error => error.includes("sugar")));
});

test("warns when nutrition basis is unknown", () => {
  const result = validateFoodLabel({
    ingredients: ["Rice"], allergens: [], nutrition: { calories: 100 }, nutritionBasis: "unknown"
  });
  assert.ok(result.warnings.some(warning => warning.includes("basis is unknown")));
});

test("warns when extracted macros exceed 100 g per 100 g", () => {
  const result = validateFoodLabel({
    ingredients: ["Rice"], allergens: [],
    nutrition: { totalFat: 60, protein: 30, fiber: 20, sugar: 10 },
    rawNutrition: {
      fat: { value: 60, unit: "g" },
      protein: { value: 30, unit: "g" },
      carbohydrates: { value: 20, unit: "g" }
    },
    nutritionBasis: "per_100g"
  });
  assert.ok(result.warnings.some(warning => warning.includes("more than 100 g")));
});

test("accepts the full extraction response as input", () => {
  const result = validateFoodLabel({ success: true, parsedData: {
    ingredients: ["Wheat"], allergens: ["Wheat"], nutrition: { calories: 200 }, nutritionBasis: "per_100g"
  } });
  assert.equal(result.valid, true);
});

test("rejects unsupported nutrition-basis values", () => {
  const result = validateFoodLabel({
    productName: "Rice",
    ingredients: ["Rice"],
    allergens: [],
    nutrition: { calories: 100 },
    nutritionBasis: "per_100ml"
  });

  assert.equal(result.valid, false);
  assert.equal(result.needsReview, true);
  assert.ok(result.errors.some(error => error.includes("nutritionBasis")));
  assert.ok(result.checks.some(check => check.name === "nutrition_basis_valid" && !check.passed));
});

test("treats a missing nutrition basis as unknown and requires review", () => {
  const result = validateFoodLabel({
    productName: "Rice",
    ingredients: ["Rice"],
    allergens: [],
    nutrition: { calories: 100 }
  });

  assert.equal(result.valid, true);
  assert.equal(result.needsReview, true);
  assert.ok(result.warnings.some(warning => warning.includes("basis is unknown")));
});