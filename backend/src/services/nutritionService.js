function normalizeNutrition(nutrition, servingSize, nutritionBasis = "per-serving") {
    if (
        !nutrition ||
        typeof nutrition !== "object" ||
        Array.isArray(nutrition)
    ) {
        throw new Error("Nutrition information is required.");
    }

    const alreadyNormalized = [
        "per-100g",
        "per-100ml"
    ].includes(nutritionBasis);

    let unit;

    if (alreadyNormalized) {
        unit = nutritionBasis === "per-100g" ? "g" : "ml";
    } else {
        if (
            !servingSize ||
            typeof servingSize.value !== "number" ||
            !Number.isFinite(servingSize.value) ||
            servingSize.value <= 0
        ) {
            throw new Error("A valid serving size is required.");
        }

        unit = servingSize.unit?.toLowerCase();

        if (!["g", "ml"].includes(unit)) {
            throw new Error("Serving size must be in g or ml.");
        }
    }

    const normalized = {};

    for (const [nutrient, data] of Object.entries(nutrition)) {
        if (
            !data ||
            typeof data.value !== "number" ||
            !Number.isFinite(data.value) ||
            data.value < 0
        ) {
            normalized[nutrient] = null;
            continue;
        }

        const nutrientUnit = data.unit?.toLowerCase();

        if (!["g", "mg", "kcal", "kj"].includes(nutrientUnit)) {
            normalized[nutrient] = null;
            continue;
        }

        let value = data.value;
        let outputUnit = nutrientUnit;

        if (nutrientUnit === "mg") {
            value = value / 1000;
            outputUnit = "g";
        }

        const per100 = alreadyNormalized
            ? value
            : (value / servingSize.value) * 100;

        if (!Number.isFinite(per100)) {
            normalized[nutrient] = null;
            continue;
        }

        normalized[nutrient] = {
            value: Number(per100.toFixed(2)),
            unit: outputUnit
        };
    }

    return {
        basis: unit === "g" ? "per 100g" : "per 100ml",
        values: normalized
    };
}

module.exports = { normalizeNutrition };
