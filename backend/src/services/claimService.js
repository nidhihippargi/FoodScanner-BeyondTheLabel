const { detectSugarAliases } = require("./ingredientService");

function verifyClaim(claim, ingredients, nutrition = {}) {
    if (
        typeof claim !== "string" ||
        !claim.trim() ||
        typeof ingredients !== "string" ||
        !ingredients.trim()
    ) {
        throw new Error("Claim and ingredient information are required.");
    }

    const normalizedClaim = claim.toLowerCase().trim();
    const normalizedIngredients = ingredients.toLowerCase();

    const findings = [];

    // Rule 1: 100% real fruit
    if (
        normalizedClaim.includes("100% real fruit") ||
        normalizedClaim.includes("100% fruit")
    ) {
        const nonFruitIngredients = [
            "maltodextrin",
            "artificial flavour",
            "artificial flavor",
            "added colour",
            "added color",
            "vegetable oil"
        ];

        const detected = nonFruitIngredients.filter(item =>
            normalizedIngredients.includes(item)
        );

        if (detected.length > 0) {
            findings.push({
                status: "potentially_inconsistent",
                claim,
                evidence: detected,
                explanation:
                    "The ingredient list contains non-fruit ingredients. This warrants further verification of the 100% fruit claim."
            });
        } else {
            findings.push({
                status: "insufficient_information",
                claim,
                evidence: [],
                explanation:
                    "The available ingredient list alone cannot establish whether the product is entirely fruit-derived."
            });
        }
    }

    // Rule 2: No added sugar
    else if (
        normalizedClaim.includes("no added sugar") ||
        normalizedClaim.includes("no sugar added")
    ) {
        const sugarResult = detectSugarAliases(ingredients);

        if (sugarResult.totalDetected > 0) {
            findings.push({
                status: "potentially_inconsistent",
                claim,
                evidence: sugarResult.detected.map(item => item.name),
                explanation:
                    "Ingredients associated with sugars or sweeteners were detected. Their role and source require verification."
            });
        } else {
            findings.push({
                status: "insufficient_information",
                claim,
                evidence: [],
                explanation:
                    "No supported sugar aliases were detected, but the available information is insufficient to establish this claim."
            });
        }
    }

    // Rule 3: Sugar-free
    else if (
        normalizedClaim.includes("sugar-free") ||
        normalizedClaim.includes("sugar free")
    ) {
        if (typeof nutrition.sugarPer100g === "number") {
            if (nutrition.sugarPer100g > 0.5) {
                findings.push({
                    status: "potentially_inconsistent",
                    claim,
                    evidence: [
                        `${nutrition.sugarPer100g} g sugar per 100 g`
                    ],
                    explanation:
                        "The reported sugar content warrants checking against the applicable sugar-free standard."
                });
            } else {
                findings.push({
                    status: "requires_regulatory_verification",
                    claim,
                    evidence: [
                        `${nutrition.sugarPer100g} g sugar per 100 g`
                    ],
                    explanation:
                        "The reported value is low, but the applicable regulatory definition and product category must be checked."
                });
            }
        } else {
            findings.push({
                status: "insufficient_information",
                claim,
                evidence: [],
                explanation:
                    "Sugar nutrition information is unavailable or incomplete."
            });
        }
    }

    else {
        findings.push({
            status: "unsupported_claim_type",
            claim,
            evidence: [],
            explanation:
                "This claim is not currently supported by the verification rules."
        });
    }

    return {
        claim,
        findings
    };
}

module.exports = { verifyClaim };
