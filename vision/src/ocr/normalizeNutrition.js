const NORMALIZED_KEYS = [
  "calories",
  "sugar",
  "sodium",
  "saturatedFat",
  "totalFat",
  "protein",
  "fiber"
];

/**
 * Convert extracted nutrition values to a predictable set of numeric fields.
 * Calories are kcal, sodium is mg, and remaining nutrients are grams.
 * Missing or unsupported values remain null; no values are inferred.
 */
function normalizeNutrition(rawNutrition = {}) {
  const raw = rawNutrition && typeof rawNutrition === "object" ? rawNutrition : {};
  return {
    calories: convert(findValue(raw, ["energy", "calories"]), "kcal"),
    sugar: convert(findValue(raw, ["sugars", "sugar"]), "g"),
    sodium: convert(findValue(raw, ["sodium"]), "mg"),
    saturatedFat: convert(findValue(raw, ["saturatedFat", "saturated_fat"]), "g"),
    totalFat: convert(findValue(raw, ["fat", "totalFat", "total_fat"]), "g"),
    protein: convert(findValue(raw, ["protein"]), "g"),
    fiber: convert(findValue(raw, ["fiber", "fibre"]), "g")
  };
}

function findValue(raw, keys) {
  for (const key of keys) {
    if (raw[key] && typeof raw[key] === "object") return raw[key];
  }
  return null;
}

function convert(item, targetUnit) {
  if (!item || typeof item !== "object" || !Number.isFinite(item.value)) return null;
  const value = item.value;
  const unit = typeof item.unit === "string" ? item.unit.toLowerCase().replace(/\s/g, "") : "";
  let converted;

  if (targetUnit === "kcal") {
    if (unit === "kcal" || unit === "cal") converted = unit === "cal" ? value / 1000 : value;
    else if (unit === "kj") converted = value / 4.184;
    else return null;
  } else if (targetUnit === "mg") {
    if (unit === "mg") converted = value;
    else if (unit === "g") converted = value * 1000;
    else return null;
  } else {
    if (unit === "g") converted = value;
    else if (unit === "mg") converted = value / 1000;
    else return null;
  }

  return Number(converted.toFixed(2));
}

module.exports = { normalizeNutrition, NORMALIZED_KEYS };
