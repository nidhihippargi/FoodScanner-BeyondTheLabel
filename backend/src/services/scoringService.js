// FoodScanner provisional scoring algorithm – Version 1

const NUTRIENT_RULES = {
    sugar: {
        weight: 35,
        score: v => v <= 5 ? 100 : v <= 10 ? 80 : v <= 15 ? 60 : v <= 22.5 ? 30 : 0
    },
    sodium: {
        weight: 25,
        score: v => {
            const mg = v * 1000;
            return mg <= 120 ? 100 : mg <= 400 ? 75 :
                mg <= 600 ? 50 : mg <= 900 ? 25 : 0;
        }
    },
    saturatedFat: {
        weight: 20,
        score: v => v <= 1.5 ? 100 : v <= 5 ? 70 :
            v <= 10 ? 35 : 0
    },
    fiber: {
        weight: 10,
        score: v => v >= 6 ? 100 : v >= 3 ? 60 :
            v > 0 ? 20 : 0
    },
    protein: {
        weight: 10,
        score: v => v >= 10 ? 100 : v >= 5 ? 60 :
            v > 0 ? 20 : 0
    }
};

function getNutrientValue(values, nutrient) {
    const aliases = {
        saturatedFat: ["saturatedFat", "saturated_fat", "saturated fat", "saturated-fat"],
        fiber: ["fiber", "fibre"]
    };

    const keys = aliases[nutrient] || [nutrient];

    for (const key of keys) {
        const item = values?.[key];

        if (
            item &&
            typeof item.value === "number" &&
            Number.isFinite(item.value) &&
            item.value >= 0 &&
            item.unit === "g"
        ) {
            return item.value;
        }
    }

    return null;
}

function calculateNutritionScore(nutritionAnalysis) {
    const values = nutritionAnalysis?.values;

    if (!values) {
        return null;
    }

    let earned = 0;
    let available = 0;
    const breakdown = {};

    for (const [nutrient, rule] of Object.entries(NUTRIENT_RULES)) {
        const value = getNutrientValue(values, nutrient);

        if (value === null) {
            breakdown[nutrient] = {
                status: "not_available",
                points: null,
                weight: rule.weight
            };
            continue;
        }

        const points = rule.score(value);

        earned += (points / 100) * rule.weight;
        available += rule.weight;

        breakdown[nutrient] = {
            status: "scored",
            valuePer100: value,
            unit: "g",
            score: points,
            weight: rule.weight
        };
    }

    if (available === 0) {
        return null;
    }

    return {
        score: Number(((earned / available) * 40).toFixed(2)),
        maxScore: 40,
        dataCompleteness: Math.round((available / 100) * 100),
        breakdown
    };
}

function calculateIngredientScore(ingredientAnalysis) {
    if (!ingredientAnalysis ||
        !Number.isInteger(ingredientAnalysis.totalDetected)) {
        return null;
    }

    const detected = Math.max(0, ingredientAnalysis.totalDetected);
    const penalty = Math.min(detected * 3, 15);

    return {
        score: 35 - penalty,
        maxScore: 35,
        detectedAliases: detected,
        penalty,
        explanation: "Provisional deductions based on detected sugar aliases. This is not a complete ingredient safety assessment."
    };
}

function calculateClaimScore(claimAnalysis) {
    if (!Array.isArray(claimAnalysis) || claimAnalysis.length === 0) {
        return null;
    }

    const supportedFindings = claimAnalysis.flatMap(item =>
        (item.findings || []).filter(finding =>
            [
                "potentially_inconsistent",
                "requires_regulatory_verification",
                "insufficient_information"
            ].includes(finding.status)
        )
    );

    if (supportedFindings.length === 0) {
        return null;
    }

    const inconsistent = supportedFindings.filter(
        finding => finding.status === "potentially_inconsistent"
    ).length;

    const penalty = Math.min(inconsistent * 10, 25);

    return {
        score: 25 - penalty,
        maxScore: 25,
        claimsChecked: supportedFindings.length,
        potentiallyInconsistent: inconsistent,
        penalty,
        explanation: "Potentially inconsistent claims reduce the score. Inconclusive claims are not automatically treated as false."
    };
}

function calculateProductScore(analysis) {
    const nutrition = calculateNutritionScore(analysis.nutrition);
    const ingredients = calculateIngredientScore(analysis.ingredients);
    const claims = calculateClaimScore(analysis.claims);

    const components = {
        nutrition,
        ingredients,
        claims
    };

    let earned = 0;
    let available = 0;

    for (const component of Object.values(components)) {
        if (component !== null) {
            earned += component.score;
            available += component.maxScore;
        }
    }

    const score = available > 0
        ? Math.round((earned / available) * 100)
        : null;

    const nutritionCompleteness = nutrition?.dataCompleteness || 0;

    const dataCompleteness = Math.round(
        (nutritionCompleteness * 0.40) +
        (ingredients !== null ? 35 : 0) +
        (claims !== null ? 25 : 0)
    );

    const rating = score === null ? null :
        score >= 80 ? "Good" :
        score >= 60 ? "Moderate" :
        score >= 40 ? "Poor" : "Very Poor";

    const confidence = dataCompleteness >= 80 ? "High" :
        dataCompleteness >= 50 ? "Moderate" : "Limited";

    return {
        score,
        maxScore: 100,
        rating,
        confidence,
        dataCompleteness,
        components,
        methodology: "Provisional app-defined score. Available components are normalized to 100 when other components are missing. Ingredient deductions and nutrient thresholds require validation."
    };
}

module.exports = {
    calculateProductScore,
    calculateNutritionScore,
    calculateIngredientScore,
    calculateClaimScore
};
