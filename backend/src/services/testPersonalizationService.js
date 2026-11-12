const assert = require("assert");
const {
    analyzePersonalization
} = require("./personalizationService");

// Test 1: Vegan preference
const test1 = analyzePersonalization(
    "Wheat flour, milk powder, sugar",
    {},
    ["vegan"]
);
assert.strictEqual(test1.findings[0].status, "preference_mismatch");

// Test 2: Vegetarian preference
const test2 = analyzePersonalization(
    "Wheat flour, gelatin, salt",
    {},
    ["vegetarian"]
);
assert.strictEqual(test2.findings[0].status, "preference_mismatch");

// Test 3: Gluten-free preference
const test3 = analyzePersonalization(
    "Wheat flour, sugar, salt",
    {},
    ["gluten-free"]
);
assert.strictEqual(test3.findings[0].status, "preference_mismatch");

// Test 4: Dairy-free preference
const test4 = analyzePersonalization(
    "Wheat flour, whey, sugar",
    {},
    ["dairy-free"]
);
assert.strictEqual(test4.findings[0].status, "preference_mismatch");

// Test 5: Nut-free preference
const test5 = analyzePersonalization(
    "Wheat flour, almonds, sugar",
    {},
    ["nut-free"]
);
assert.strictEqual(test5.findings[0].status, "preference_mismatch");

// Test 6: Low-sugar preference
const test6 = analyzePersonalization(
    "Wheat flour, sugar",
    { sugar: 12 },
    ["low-sugar"]
);
assert.strictEqual(test6.findings[0].status, "preference_mismatch");

// Test 7: No mismatch detected
const test7 = analyzePersonalization(
    "Wheat flour, salt, water",
    { sugar: 2 },
    ["vegan", "low-sugar"]
);
assert.strictEqual(test7.findings[0].status, "no_mismatch_detected");
assert.strictEqual(test7.findings[1].status, "no_mismatch_detected");

// Test 8: Missing nutrition information
const test8 = analyzePersonalization(
    "Wheat flour, salt",
    {},
    ["low-sugar"]
);
assert.strictEqual(test8.findings[0].status, "insufficient_information");

// Test 9: Unsupported preference
const test9 = analyzePersonalization(
    "Wheat flour, salt",
    {},
    ["keto"]
);
assert.strictEqual(test9.unsupportedPreferences.length, 1);

// Test 10: Invalid inputs
assert.throws(() =>
    analyzePersonalization("", {}, ["vegan"])
);

assert.throws(() =>
    analyzePersonalization("Wheat flour", {}, "vegan")
);

console.log("All 10 personalization test groups passed!");
