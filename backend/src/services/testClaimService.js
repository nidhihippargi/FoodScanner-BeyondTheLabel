const assert = require("assert");
const { verifyClaim } = require("./claimService");

// Test 1: Potentially inconsistent fruit claim
const test1 = verifyClaim(
    "100% Real Fruit",
    "Sugar, maltodextrin, fruit concentrate"
);
assert.strictEqual(
    test1.findings[0].status,
    "potentially_inconsistent"
);

// Test 2: No added sugar with syrup
const test2 = verifyClaim(
    "No Added Sugar",
    "Dates, invert syrup, water"
);
assert.strictEqual(
    test2.findings[0].status,
    "potentially_inconsistent"
);

// Test 3: Insufficient information
const test3 = verifyClaim(
    "100% Real Fruit",
    "Apple, mango, water"
);
assert.strictEqual(
    test3.findings[0].status,
    "insufficient_information"
);

// Test 4: Sugar-free with high sugar
const test4 = verifyClaim(
    "Sugar-Free",
    "Wheat flour, salt",
    { sugarPer100g: 8 }
);
assert.strictEqual(
    test4.findings[0].status,
    "potentially_inconsistent"
);

// Test 5: Sugar-free with missing nutrition
const test5 = verifyClaim(
    "Sugar-Free",
    "Wheat flour, salt"
);
assert.strictEqual(
    test5.findings[0].status,
    "insufficient_information"
);

// Test 6: Unsupported claim
const test6 = verifyClaim(
    "100% Natural",
    "Wheat flour, salt"
);
assert.strictEqual(
    test6.findings[0].status,
    "unsupported_claim_type"
);

// Test 7: Invalid input
assert.throws(() =>
    verifyClaim("", "Sugar, water")
);

console.log("All 7 claim verification test groups passed!");
