
const test = require("node:test");
const assert = require("node:assert/strict");

const {
  extractLabelData
} = require("../src/ocr/extractLabelData");

test("extracts ingredients", () => {
  const result = extractLabelData(
    "Ingredients: Sugar, Milk, Cocoa"
  );

  assert.equal(result.success, true);
  assert.deepEqual(result.ingredients, [
    "Sugar",
    "Milk",
    "Cocoa"
  ]);
});

test("extracts allergen information", () => {
  const result = extractLabelData(
    "Allergens: Milk, Soy"
  );

  assert.deepEqual(result.allergens, ["Milk", "Soy"]);
});

test("extracts nutrition information", () => {
  const result = extractLabelData(
    "Protein: 5g\nFat: 10g\nEnergy: 200 kcal"
  );

  assert.deepEqual(result.nutrition, {
    energy: { value: 200, unit: "kcal" },
    protein: { value: 5, unit: "g" },
    fat: { value: 10, unit: "g" }
  });
});

test("extracts serving size", () => {
  const result = extractLabelData(
    "Serving Size: 30g"
  );

  assert.equal(result.servingSize, "30g");
});

test("rejects empty text", () => {
  const result = extractLabelData("");

  assert.equal(result.success, false);
  assert.deepEqual(result.ingredients, []);
});

test("rejects non-string input", () => {
  const result = extractLabelData(null);

  assert.equal(result.success, false);
});


test("extracts ingredients across multiple lines", () => {
  const result = extractLabelData(
    "Ingredients: Wheat flour, Sugar,\nVegetable oil, Salt\nContains: Wheat"
  );

  assert.deepEqual(result.ingredients, [
    "Wheat flour",
    "Sugar",
    "Vegetable oil",
    "Salt"
  ]);
});

test("does not include allergen headings in ingredients", () => {
  const result = extractLabelData(
    "Ingredients: Wheat flour, Sugar\nAllergens: Milk, Soy"
  );

  assert.deepEqual(result.ingredients, [
    "Wheat flour",
    "Sugar"
  ]);
});

test("removes duplicate ingredients and allergens", () => {
  const result = extractLabelData(
    "Ingredients: Sugar, Milk, Sugar\nAllergens: Milk, Soy, Milk"
  );

  assert.deepEqual(result.ingredients, ["Sugar", "Milk"]);
  assert.deepEqual(result.allergens, ["Milk", "Soy"]);
});

test("extracts fibre and sodium values", () => {
  const result = extractLabelData(
    "Fibre: 4g\nSodium: 120mg"
  );

  assert.deepEqual(result.nutrition, {
    fiber: { value: 4, unit: "g" },
    sodium: { value: 120, unit: "mg" }
  });
});

test("does not extract nutrition values without units", () => {
  const result = extractLabelData(
    "Protein: 5\nFat: 10"
  );

  assert.deepEqual(result.nutrition, {});
});

test("extracts total carbohydrate values", () => {
  const result = extractLabelData(
    "Total Carbohydrate: 30g"
  );

  assert.deepEqual(result.nutrition.carbohydrates, {
    value: 30,
    unit: "g"
  });
});


test("extracts information from a realistic food label", () => {
  const result = extractLabelData(
    `Ingredients:
Wheat flour, Sugar, Vegetable oil
(Contains Soy), Milk solids, Salt

Allergen Information: Contains Wheat, Milk, Soy

Nutrition Information:
Energy: 450 kcal
Protein: 8 g
Total Carbohydrate: 65 g
Total Fat: 15 g
Sodium: 300 mg

Serving Size: 50 g`
  );

  assert.equal(result.success, true);

  assert.deepEqual(result.ingredients, [
    "Wheat flour",
    "Sugar",
    "Vegetable oil (Contains Soy)",
    "Milk solids",
    "Salt"
  ]);

  assert.deepEqual(result.allergens, [
    "Wheat",
    "Milk",
    "Soy"
  ]);

  assert.equal(result.nutrition.energy.value, 450);
  assert.equal(result.nutrition.protein.value, 8);
  assert.equal(result.nutrition.carbohydrates.value, 65);
  assert.equal(result.nutrition.fat.value, 15);
  assert.equal(result.nutrition.sodium.value, 300);

  assert.equal(result.servingSize, "50 g");
});



test("preserves commas inside parentheses when extracting ingredients", () => {
  const result = extractLabelData(
    "Ingredients: Wheat flour, Vegetable oil (Palm oil, Sunflower oil), Sugar, Salt"
  );

  assert.deepEqual(result.ingredients, [
    "Wheat flour",
    "Vegetable oil (Palm oil, Sunflower oil)",
    "Sugar",
    "Salt"
  ]);
});
