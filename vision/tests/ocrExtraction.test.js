const test = require("node:test");
const assert = require("node:assert/strict");
const { extractLabelData } = require("../src/ocr/extractLabelData");
const { normalizeNutrition } = require("../src/ocr/normalizeNutrition");
const { processOcrResult } = require("../src/ocr/processOcrResult");

test("extracts ingredients, allergens and nutrition from a realistic label", () => {
  const result = extractLabelData(`
    Choco Crunch
    Ingredients: Wheat flour, Sugar, Vegetable oil (Palm oil, Sunflower oil), Milk solids, Salt
    Allergen Information: Contains Wheat, Milk, Soy
    Nutrition Information per 100 g:
    Energy: 450 kcal
    Protein: 8 g
    Total Carbohydrate: 65 g
    Total Fat: 15 g
    Saturated Fat: 6 g
    Sugars: 22 g
    Fibre: 4 g
    Sodium: 300 mg
    Serving Size: 50 g
  `);

  assert.equal(result.success, true);
  assert.equal(result.parsedData.productName, "Choco Crunch");
  assert.deepEqual(result.parsedData.ingredients, [
    "Wheat flour", "Sugar", "Vegetable oil (Palm oil, Sunflower oil)", "Milk solids", "Salt"
  ]);
  assert.ok(result.parsedData.allergens.includes("Wheat"));
  assert.ok(result.parsedData.allergens.includes("Milk"));
  assert.ok(result.parsedData.allergens.includes("Soy"));
  assert.equal(result.parsedData.rawNutrition.energy.value, 450);
  assert.equal(result.parsedData.nutrition.calories, 450);
  assert.equal(result.parsedData.nutrition.sodium, 300);
  assert.equal(result.parsedData.nutritionBasis, "per_100g");
  assert.equal(result.parsedData.servingSize, "50 g");
  assert.equal(result.confidence, null);
  assert.equal(result.extractionConfidence.method, "rule_based_heuristic");
});

test("extracts an explicit product name", () => {
  const result = extractLabelData("Product Name: Oat Biscuits\nIngredients: Oats, Sugar");
  assert.equal(result.parsedData.productName, "Oat Biscuits");
});

test("returns null rather than inventing a product name", () => {
  const result = extractLabelData("Ingredients: Wheat, Sugar");
  assert.equal(result.parsedData.productName, null);
});

test("splits ingredients across lines but preserves commas inside nested components", () => {
  const result = extractLabelData(
    "Ingredients: Wheat flour, Sugar,\nVegetable oil (Palm oil, Sunflower oil), Salt\nContains: Wheat"
  );
  assert.deepEqual(result.parsedData.ingredients, [
    "Wheat flour", "Sugar", "Vegetable oil (Palm oil, Sunflower oil)", "Salt"
  ]);
});

test("stops the ingredient section before allergen and nutrition sections", () => {
  const result = extractLabelData(
    "Ingredients: Wheat flour, Sugar\nAllergen Information: Contains Milk\nNutrition Information: Energy 200 kcal"
  );
  assert.deepEqual(result.parsedData.ingredients, ["Wheat flour", "Sugar"]);
});

test("detects allergens mentioned inside the ingredient list", () => {
  const result = extractLabelData("Ingredients: Wheat flour, Whey powder, Soy lecithin, Sesame seeds");
  assert.ok(result.parsedData.allergens.includes("Wheat"));
  assert.ok(result.parsedData.allergens.includes("Milk"));
  assert.ok(result.parsedData.allergens.includes("Soy"));
  assert.ok(result.parsedData.allergens.includes("Sesame"));
  assert.ok(result.parsedData.allergenEvidence.some(item => item.name === "Milk" && item.sources.includes("ingredients")));
});

test("extracts may-contain allergen statements separately as evidence", () => {
  const result = extractLabelData("Ingredients: Rice flour, Salt\nMay contain: Peanuts");
  assert.ok(result.parsedData.allergens.includes("Peanut"));
  assert.ok(result.parsedData.allergenEvidence.some(item => item.name === "Peanut" && item.sources.includes("allergen_statement")));
});

test("deduplicates ingredients without changing their displayed names", () => {
  const result = extractLabelData("Ingredients: Sugar, Milk, sugar, MILK");
  assert.deepEqual(result.parsedData.ingredients, ["Sugar", "Milk"]);
});

test("extracts multiple nutrition fields with their original units", () => {
  const result = extractLabelData(
    "Energy: 1880 kJ / 450 kcal\nProtein: 8 g\nTotal Carbohydrate: 65 g\nTotal Fat: 15 g\nSaturated Fat: 6 g\nSugars: 22 g\nFibre: 4 g\nSodium: 300 mg"
  );
  assert.equal(result.parsedData.rawNutrition.energy.value, 450);
  assert.equal(result.parsedData.rawNutrition.energy.unit, "kcal");
  assert.equal(result.parsedData.rawNutrition.saturatedFat.value, 6);
  assert.equal(result.parsedData.nutrition.totalFat, 15);
  assert.equal(result.parsedData.nutrition.sugar, 22);
  assert.equal(result.parsedData.nutrition.fiber, 4);
});

test("does not extract numeric nutrition values without units", () => {
  const result = extractLabelData("Protein: 5\nFat: 10");
  assert.deepEqual(result.parsedData.rawNutrition, {});
});

test("converts kJ, mg and g without modifying raw nutrition", () => {
  const result = normalizeNutrition({
    energy: { value: 418.4, unit: "kj" },
    sodium: { value: 1.2, unit: "g" },
    protein: { value: 500, unit: "mg" }
  });
  assert.equal(result.calories, 100);
  assert.equal(result.sodium, 1200);
  assert.equal(result.protein, 0.5);
  assert.equal(result.totalFat, null);
});

test("detects per-serving basis", () => {
  const result = extractLabelData("Nutrition Information per serving\nEnergy: 200 kcal\nProtein: 5 g");
  assert.equal(result.parsedData.nutritionBasis, "per_serving");
});

test("does not guess when per 100 g and per serving values both appear", () => {
  const result = extractLabelData("Per 100 g\nPer serving\nEnergy: 200 kcal");
  assert.equal(result.parsedData.nutritionBasis, "unknown");
});

test("does not mistake per 100 ml for per 100 g", () => {
  const result = extractLabelData("Nutrition per 100 ml\nEnergy: 200 kcal");
  assert.equal(result.parsedData.nutritionBasis, "unknown");
});

test("preserves supplied OCR confidence and never creates one", () => {
  const noConfidence = extractLabelData("Ingredients: Wheat, Sugar");
  const supplied = extractLabelData("Ingredients: Wheat, Sugar", { confidence: { overall: 0.87 } });
  assert.equal(noConfidence.confidence, null);
  assert.deepEqual(supplied.confidence, { overall: 0.87 });
});

test("invalid text returns a structured failure", () => {
  assert.equal(extractLabelData("").success, false);
  assert.equal(extractLabelData(null).parsedData, null);
});

test("runs a complete OCR provider result through extraction", () => {
  const result = processOcrResult({
    engine: "test-provider",
    text: "Product Name: Trail Mix\r\nIngredients: Almonds, Raisins, Peanuts\r\nEnergy: 500 kcal",
    confidence: 0.91,
    blocks: ["Product Name: Trail Mix"]
  });
  assert.equal(result.success, true);
  assert.equal(result.engine, "test-provider");
  assert.equal(result.parsedData.productName, "Trail Mix");
  assert.equal(result.parsedData.nutrition.calories, 500);
  assert.equal(result.confidence.overall, 0.91);
  assert.ok(result.warnings.length > 0);
});

test("extracts ingredient percentages and nested sub-ingredients", () => {
  const result = extractLabelData(
    "Ingredients: Almonds (20%), Vegetable oil (Palm oil, Sunflower oil), Sugar 10%"
  );
  assert.deepEqual(result.parsedData.ingredientDetails, [
    { name: "Almonds", percentage: 20, subIngredients: [] },
    { name: "Vegetable oil", percentage: null, subIngredients: ["Palm oil", "Sunflower oil"] },
    { name: "Sugar", percentage: 10, subIngredients: [] }
  ]);
});
