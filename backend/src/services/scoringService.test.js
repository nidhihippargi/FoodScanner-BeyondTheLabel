const {
    calculateProductScore,
    calculateNutritionScore,
    calculateIngredientScore,
    calculateClaimScore
} = require("./scoringService");

describe("FoodScanner Scoring Service", () => {
    test("calculates nutrition score from available nutrients", () => {
        const result = calculateNutritionScore({
            values: {
                sugar: { value: 4, unit: "g" },
                sodium: { value: 0.1, unit: "g" },
                fiber: { value: 7, unit: "g" }
            }
        });
        expect(result.score).toBeGreaterThan(0);
        expect(result.maxScore).toBe(40);
    });

    test("handles missing nutrition data", () => {
        expect(calculateNutritionScore(null)).toBeNull();
    });

    test("deducts points for detected sugar aliases", () => {
        const result = calculateIngredientScore({ totalDetected: 2 });
        expect(result.score).toBe(29);
        expect(result.penalty).toBe(6);
    });

    test("does not exceed ingredient penalty cap", () => {
        const result = calculateIngredientScore({ totalDetected: 10 });
        expect(result.score).toBe(20);
    });

    test("penalizes potentially inconsistent claims", () => {
        const result = calculateClaimScore([{
            findings: [{ status: "potentially_inconsistent" }]
        }]);
        expect(result.score).toBe(15);
    });

    test("does not penalize inconclusive claims", () => {
        const result = calculateClaimScore([{
            findings: [{ status: "insufficient_information" }]
        }]);
        expect(result.score).toBe(25);
    });

    test("calculates combined product score", () => {
        const result = calculateProductScore({
            nutrition: {
                values: {
                    sugar: { value: 4, unit: "g" },
                    sodium: { value: 0.1, unit: "g" },
                    fiber: { value: 7, unit: "g" }
                }
            },
            ingredients: { totalDetected: 1 },
            claims: [{
                findings: [{ status: "potentially_inconsistent" }]
            }]
        });

        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(100);
        expect(result.maxScore).toBe(100);
    });

    test("reports missing components instead of inventing a score", () => {
        const result = calculateProductScore({
            nutrition: null,
            ingredients: null,
            claims: null
        });

        expect(result.score).toBeNull();
        expect(result.rating).toBeNull();
    });
});

describe("Scoring completeness regression", () => {
    test("reports 78% completeness and moderate confidence for the sample data", () => {
        const result = calculateProductScore({
            nutrition: {
                values: {
                    sugar: { value: 12, unit: "g" },
                    protein: { value: 10, unit: "g" }
                }
            },
            ingredients: { totalDetected: 1 },
            claims: [
                { findings: [{ status: "potentially_inconsistent" }] },
                { findings: [{ status: "potentially_inconsistent" }] }
            ]
        });

        expect(result.score).toBe(65);
        expect(result.dataCompleteness).toBe(78);
        expect(result.confidence).toBe("Moderate");
    });
});
