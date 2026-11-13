const assert = require("assert");
const { detectSugarAliases } = require("./ingredientService");

// Test 1: Normal detection
const test1 = detectSugarAliases(
    "Wheat flour, Maltodextrin, Invert syrup, Salt"
);
assert.strictEqual(test1.totalDetected, 2);

// Test 2: Case insensitivity
const test2 = detectSugarAliases(
    "MALTODEXTRIN, INVERT SYRUP"
);
assert.strictEqual(test2.totalDetected, 2);

// Test 3: Punctuation handling
const test3 = detectSugarAliases(
    "Wheat flour (maltodextrin), honey."
);
assert.strictEqual(test3.totalDetected, 2);

// Test 4: No partial-word matches
const test4 = detectSugarAliases(
    "Maltodextrinated wheat flour"
);
assert.strictEqual(test4.totalDetected, 0);

// Test 5: Duplicate ingredients
const test5 = detectSugarAliases(
    "Maltodextrin, salt, maltodextrin"
);
assert.strictEqual(test5.totalDetected, 1);

// Test 6: No sugar aliases
const test6 = detectSugarAliases(
    "Wheat flour, salt, water"
);
assert.strictEqual(test6.totalDetected, 0);

// Test 7: Invalid input
assert.throws(() => detectSugarAliases(""));
assert.throws(() => detectSugarAliases(null));
assert.throws(() => detectSugarAliases(123));

console.log("All 7 test groups passed!");
