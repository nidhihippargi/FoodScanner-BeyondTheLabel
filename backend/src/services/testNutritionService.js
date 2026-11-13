const assert = require("assert");
const { normalizeNutrition } = require("./nutritionService");

// Test 1: Basic normalization
const result1 = normalizeNutrition(
    { sugar: { value: 10, unit: "g" } },
    { value: 25, unit: "g" }
);
assert.strictEqual(result1.values.sugar.value, 40);
assert.strictEqual(result1.values.sugar.unit, "g");

// Test 2: Multiple nutrients
const result2 = normalizeNutrition(
    {
        sugar: { value: 10, unit: "g" },
        protein: { value: 5, unit: "g" }
    },
    { value: 50, unit: "g" }
);
assert.strictEqual(result2.values.sugar.value, 20);
assert.strictEqual(result2.values.protein.value, 10);

// Test 3: Milligrams to grams
const result3 = normalizeNutrition(
    { sodium: { value: 500, unit: "mg" } },
    { value: 50, unit: "g" }
);
assert.deepStrictEqual(result3.values.sodium, {
    value: 1,
    unit: "g"
});

// Test 4: Liquid product
const result4 = normalizeNutrition(
    { sugar: { value: 5, unit: "g" } },
    { value: 25, unit: "ml" }
);
assert.strictEqual(result4.values.sugar.value, 20);
assert.strictEqual(result4.basis, "per 100ml");

// Test 5: Missing nutrient
const result5 = normalizeNutrition(
    { sugar: null },
    { value: 25, unit: "g" }
);
assert.strictEqual(result5.values.sugar, null);

// Test 6: Invalid serving size
for (const value of [0, -5, NaN, Infinity]) {
    assert.throws(() =>
        normalizeNutrition(
            { sugar: { value: 10, unit: "g" } },
            { value, unit: "g" }
        )
    );
}

// Test 7: Invalid serving unit
assert.throws(() =>
    normalizeNutrition(
        { sugar: { value: 10, unit: "g" } },
        { value: 25, unit: "oz" }
    )
);

// Test 8: Energy in kcal
const result8 = normalizeNutrition(
    { energy: { value: 120, unit: "kcal" } },
    { value: 30, unit: "g" }
);
assert.deepStrictEqual(result8.values.energy, {
    value: 400,
    unit: "kcal"
});

// Test 9: Energy in kJ
const result9 = normalizeNutrition(
    { energy: { value: 500, unit: "kJ" } },
    { value: 50, unit: "g" }
);
assert.deepStrictEqual(result9.values.energy, {
    value: 1000,
    unit: "kj"
});

// Test 10: Invalid nutrient value
const result10 = normalizeNutrition(
    { sugar: { value: -10, unit: "g" } },
    { value: 25, unit: "g" }
);
assert.strictEqual(result10.values.sugar, null);

// Test: Already normalized per-100g nutrition
const externalNutrition = normalizeNutrition(
    {
        sugar: { value: 13.46, unit: "g" },
        fat: { value: 7.69, unit: "g" },
        energy: { value: 385, unit: "kcal" }
    },
    { value: 100, unit: "g" },
    "per-100g"
);

assert.strictEqual(
    externalNutrition.values.sugar.value,
    13.46
);

assert.strictEqual(
    externalNutrition.values.fat.value,
    7.69
);

assert.strictEqual(
    externalNutrition.values.energy.value,
    385
);

console.log("PASS: Already normalized per-100g nutrition");

console.log("All 10 nutrition test groups passed!");
