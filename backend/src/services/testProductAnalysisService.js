const assert = require("assert");
const { analyzeProduct } = require("./productAnalysisService");

// Test 1: Complete product analysis
const result = analyzeProduct({
    productName: "Test Product",
    ingredients: "Water, sugar, maltodextrin",
    nutrition: {
        sugar: { value: 10, unit: "g" }
    },
    servingSize: { value: 25, unit: "g" },
    claims: ["No Added Sugar"],
    preferences: ["vegan", "low-sugar"]
});

assert.strictEqual(result.success, true);
assert.strictEqual(result.analysis.ingredients.totalDetected, 1);
assert.strictEqual(result.analysis.nutrition.values.sugar.value, 40);
assert.strictEqual(result.analysis.claims.length, 1);
assert.strictEqual(result.analysis.personalization.totalPreferencesChecked, 2);

// Test 2: Missing ingredients
assert.throws(() => analyzeProduct({
    productName: "Invalid Product",
    ingredients: ""
}));

// Test 3: Missing nutrition
const result3 = analyzeProduct({
    productName: "Simple Product",
    ingredients: "Water, salt",
    claims: [],
    preferences: []
});

assert.strictEqual(result3.analysis.nutrition, null);

// Test 4: Empty claims
assert.deepStrictEqual(
    analyzeProduct({
        ingredients: "Water, sugar",
        claims: [],
        preferences: []
    }).analysis.claims,
    []
);

// Test 5: Unsupported preference
const result5 = analyzeProduct({
    ingredients: "Water, sugar",
    preferences: ["keto"]
});

assert.deepStrictEqual(
    result5.analysis.personalization.unsupportedPreferences,
    ["keto"]
);

// Test 6: Invalid claims input
assert.throws(() => analyzeProduct({
    ingredients: "Water, sugar",
    claims: "No added sugar"
}));

// Test 7: Missing serving size
assert.throws(() => analyzeProduct({
    ingredients: "Water, sugar",
    nutrition: {
        sugar: { value: 10, unit: "g" }
    }
}));

console.log("All 7 product integration test groups passed!");
