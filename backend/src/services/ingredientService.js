const sugarAliases = require("../data/sugarAliases");

function normalizeText(text) {
    return text
        .toLowerCase()
        .replace(/[()[\]{}]/g, " ")
        .replace(/[^a-z0-9\s-]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function detectSugarAliases(ingredients) {
    if (typeof ingredients !== "string" || !ingredients.trim()) {
        throw new Error("Ingredients must be a non-empty string.");
    }

    const normalizedIngredients = normalizeText(ingredients);

    const detected = [];

    for (const sugar of sugarAliases) {
        for (const alias of sugar.aliases) {

            const normalizedAlias = normalizeText(alias);

            const pattern = new RegExp(
                `(^|\\s)${normalizedAlias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=\\s|$)`,
                "i"
            );

            if (pattern.test(normalizedIngredients)) {
                detected.push({
                    name: sugar.name,
                    matchedAlias: alias,
                    explanation: sugar.explanation
                });

                break;
            }
        }
    }

    return {
        totalDetected: detected.length,
        detected
    };
}

module.exports = { detectSugarAliases };
