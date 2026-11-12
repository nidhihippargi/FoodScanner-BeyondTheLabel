const preferenceRules = {
    vegan: [
        "milk", "milk powder", "whey", "casein",
        "gelatin", "honey", "egg", "egg powder",
        "butter", "cheese", "cream", "lard"
    ],

    vegetarian: [
        "gelatin", "lard", "beef", "chicken",
        "fish", "pork", "meat extract", "anchovy"
    ],

    "gluten-free": [
        "wheat", "barley", "rye", "malt",
        "semolina", "spelt", "triticale"
    ],

    "dairy-free": [
        "milk", "milk powder", "whey", "casein",
        "butter", "cheese", "cream", "lactose"
    ],

    "nut-free": [
        "peanut", "almond", "cashew", "walnut",
        "pistachio", "hazelnut", "pecan", "macadamia"
    ]
};

function normalizeIngredients(text) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function containsIngredient(text, ingredient) {
    const normalizedIngredient = normalizeIngredients(ingredient);

    const escaped = normalizedIngredient.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
    );

    const pattern = new RegExp(`\\b${escaped}s?\\b`);

    return pattern.test(text);
}

function analyzePersonalization(ingredients, nutrition = {}, preferences = []) {

    if (typeof ingredients !== "string" || !ingredients.trim()) {
        throw new Error("A valid ingredient list is required.");
    }

    if (!Array.isArray(preferences)) {
        throw new Error("Preferences must be an array.");
    }

    const normalizedIngredients = normalizeIngredients(ingredients);

    const findings = [];
    const unsupportedPreferences = [];

    for (const preference of preferences) {

        if (typeof preference !== "string") {
            unsupportedPreferences.push(preference);
            continue;
        }

        const normalizedPreference = preference.toLowerCase().trim();

        if (normalizedPreference === "low-sugar") {

            const sugar = nutrition.sugar;

            if (typeof sugar !== "number" || !Number.isFinite(sugar)) {
                findings.push({
                    preference: normalizedPreference,
                    status: "insufficient_information",
                    explanation: "Sugar nutrition information is unavailable."
                });
            } else if (sugar > 5) {
                findings.push({
                    preference: normalizedPreference,
                    status: "preference_mismatch",
                    evidence: [`${sugar} g sugar per 100 g/ml`],
                    explanation: "The product exceeds the app's initial low-sugar threshold of 5 g per 100 g/ml."
                });
            } else {
                findings.push({
                    preference: normalizedPreference,
                    status: "no_mismatch_detected",
                    explanation: "The reported sugar content is within the app's initial low-sugar threshold."
                });
            }

            continue;
        }

        const restrictedIngredients = preferenceRules[normalizedPreference];

        if (!restrictedIngredients) {
            unsupportedPreferences.push(preference);
            continue;
        }

        const detected = restrictedIngredients.filter(item =>
            containsIngredient(normalizedIngredients, item)
        );

        findings.push({
            preference: normalizedPreference,
            status: detected.length > 0
                ? "preference_mismatch"
                : "no_mismatch_detected",
            evidence: detected,
            explanation: detected.length > 0
                ? `Potential ingredients conflicting with the ${normalizedPreference} preference were detected.`
                : `No supported conflicting ingredients were detected for the ${normalizedPreference} preference.`
        });
    }

    return {
        totalPreferencesChecked: findings.length,
        findings,
        unsupportedPreferences
    };
}

module.exports = { analyzePersonalization };
