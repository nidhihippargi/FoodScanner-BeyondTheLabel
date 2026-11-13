const { detectAllergens } = require("./detectAllergens");
const { normalizeNutrition } = require("./normalizeNutrition");
const { assessExtractionConfidence } = require("./assessExtractionConfidence");

const SECTION_START = /^(?:allergens?(?:\s+information)?|contains|may\s+contain|nutrition(?:al)?\s+information|nutrition\s+facts|serving\s+size|product\s+information|manufacturer|marketed\s+by|fssai|net\s+(?:weight|quantity)|storage|directions|best\s+before)\b/i;

function extractLabelData(input, options = {}) {
  if (typeof input !== "string" || !input.trim()) {
    return {
      success: false,
      parsedData: null,
      confidence: null,
      extractionConfidence: null,
      warnings: [],
      error: "OCR text must be a non-empty string."
    };
  }

  const text = input.replace(/\r\n?/g, "\n");
  const lines = text.split("\n").map(line => line.trim()).filter(Boolean);
  const product = extractProductName(lines);
  const ingredientResult = extractIngredients(lines);
  const allergenStatements = extractAllergenStatements(lines);
  const allergenResult = detectAllergens(
    ingredientResult.ingredients.join(" "),
    allergenStatements.text
  );
  const nutritionResult = extractNutrition(lines, text);
  const servingSize = extractServingSize(lines);
  const parsedData = {
    productName: product.value,
    ingredients: ingredientResult.ingredients,
    ingredientDetails: ingredientResult.ingredients.map(parseIngredientDetail),
    allergens: allergenResult.allergens,
    allergenEvidence: allergenResult.evidence,
    rawNutrition: nutritionResult.rawNutrition,
    nutrition: normalizeNutrition(nutritionResult.rawNutrition),
    nutritionBasis: nutritionResult.basis,
    servingSize
  };

  const warnings = buildWarnings({
    productName: product.value,
    ingredients: ingredientResult.ingredients,
    ingredientDetails: ingredientResult.ingredients.map(parseIngredientDetail),
    allergens: allergenResult.allergens,
    explicitAllergens: allergenStatements.text,
    rawNutrition: nutritionResult.rawNutrition,
    nutritionBasis: nutritionResult.basis
  });

  const extractionConfidence = assessExtractionConfidence({
    productName: product.value,
    productNameSource: product.source,
    ingredients: ingredientResult.ingredients,
    ingredientsSource: ingredientResult.source,
    allergens: allergenResult.allergens,
    allergensSource: allergenStatements.text ? "explicit_label" :
      (allergenResult.allergens.length ? "ingredient_inference" : null),
    nutrition: Object.keys(nutritionResult.rawNutrition).length,
    nutritionSource: nutritionResult.source,
    servingSize,
    servingSizeSource: servingSize ? "explicit_label" : null
  });

  const suppliedConfidence = options && options.confidence &&
    Number.isFinite(options.confidence.overall)
    ? options.confidence.overall
    : null;

  return {
    success: true,
    parsedData,
    confidence: suppliedConfidence === null ? null : { overall: suppliedConfidence },
    extractionConfidence,
    warnings,
    error: null
  };
}

function extractProductName(lines) {
  const explicitPatterns = [
    /^(?:product\s+name|name\s+of\s+product|product)\s*[:\-]\s*(.+)$/i
  ];
  for (const line of lines) {
    for (const pattern of explicitPatterns) {
      const match = line.match(pattern);
      if (match && match[1].trim()) return { value: match[1].trim(), source: "explicit_label" };
    }
  }

  const stopIndex = lines.findIndex(line =>
    /^(?:ingredients?|nutrition|nutrition(?:al)?\s+information|allergens?|contains|may\s+contain|serving\s+size)\b/i.test(line)
  );
  const candidates = lines.slice(0, stopIndex === -1 ? Math.min(lines.length, 4) : stopIndex);
  const excluded = /^(?:fssai|manufacturer|marketed\s+by|manufactured\s+by|net\s+(?:weight|quantity)|mrp|batch|lot|best\s+before|packed\s+on|manufacturing\s+date|expiry|customer\s+care)\b/i;
  const candidate = candidates.find(line =>
    line.length >= 2 && line.length <= 100 &&
    !excluded.test(line) &&
    !/:/.test(line) &&
    !/^\d+[\d.,\s]*(?:g|kg|ml|l)\b/i.test(line)
  );
  return candidate
    ? { value: candidate, source: "heuristic_heading" }
    : { value: null, source: null };
}

function extractIngredients(lines) {
  const start = lines.findIndex(line => /^ingredients?\s*[:\-]?/i.test(line));
  if (start === -1) return { ingredients: [], source: null };

  const firstLine = lines[start].replace(/^ingredients?\s*[:\-]?\s*/i, "");
  const collected = [firstLine];
  for (let index = start + 1; index < lines.length; index++) {
    if (SECTION_START.test(lines[index])) break;
    collected.push(lines[index]);
  }
  const combined = collected.join(" ").replace(/\s+/g, " ").trim();
  return {
    ingredients: uniqueCaseInsensitive(splitIngredients(combined).map(cleanIngredient).filter(Boolean)),
    source: combined ? "explicit_label" : null
  };
}

function splitIngredients(text) {
  const output = [];
  let current = "";
  let parentheses = 0;
  let brackets = 0;
  let braces = 0;
  for (const character of text) {
    if (character === "(") parentheses++;
    else if (character === ")") parentheses = Math.max(0, parentheses - 1);
    else if (character === "[") brackets++;
    else if (character === "]") brackets = Math.max(0, brackets - 1);
    else if (character === "{") braces++;
    else if (character === "}") braces = Math.max(0, braces - 1);

    if (character === "," && parentheses === 0 && brackets === 0 && braces === 0) {
      if (current.trim()) output.push(current.trim());
      current = "";
    } else {
      current += character;
    }
  }
  if (current.trim()) output.push(current.trim());
  return output;
}

function parseIngredientDetail(ingredient) {
  let name = ingredient;
  let percentage = null;
  let subIngredients = [];

  const percentageMatch = name.match(/^(.*?)\s*(?:\((\d+(?:[.,]\d+)?)\s*%\)|(\d+(?:[.,]\d+)?)\s*%)\s*$/);
  if (percentageMatch) {
    name = percentageMatch[1].trim();
    percentage = Number((percentageMatch[2] || percentageMatch[3]).replace(",", "."));
  }

  const nestedMatch = name.match(/^(.*?)\(([^()]*)\)\s*$/);
  if (nestedMatch && /,|\band\b|;/i.test(nestedMatch[2]) && !/^\s*(?:contains|may contain|allergen)/i.test(nestedMatch[2])) {
    name = nestedMatch[1].trim();
    subIngredients = splitIngredients(nestedMatch[2]).map(cleanIngredient).filter(Boolean);
  }

  return { name: name || ingredient, percentage, subIngredients };
}

function cleanIngredient(value) {
  return value.replace(/^[-•*\s]+/, "").replace(/\s+/g, " ").trim();
}

function extractAllergenStatements(lines) {
  const statements = [];
  for (const line of lines) {
    const match = line.match(/^(?:allergens?(?:\s+information)?|contains|may\s+contain)\s*[:\-]?\s*(.+)$/i);
    if (match && match[1].trim()) statements.push(match[1].trim());
  }
  return { text: statements.join("; ") };
}

function extractNutrition(lines, fullText) {
  const rawNutrition = {};
  const patterns = [
    ["protein", /^(?:protein)\s*[:\-]?\s*(.+)$/i],
    ["carbohydrates", /^(?:total\s+)?carbohydrates?\s*[:\-]?\s*(.+)$/i],
    ["sugars", /^(?:of\s+which\s+)?sugars?\s*[:\-]?\s*(.+)$/i],
    ["saturatedFat", /^(?:saturated\s+fat|of\s+which\s+saturates)\s*[:\-]?\s*(.+)$/i],
    ["fat", /^(?:total\s+)?fat\s*[:\-]?\s*(.+)$/i],
    ["fiber", /^(?:dietary\s+)?(?:fiber|fibre)\s*[:\-]?\s*(.+)$/i],
    ["sodium", /^(?:sodium)\s*[:\-]?\s*(.+)$/i]
  ];

  let foundNutritionLine = false;
  for (const line of lines) {
    const energy = line.match(/^energy\s*[:\-]?\s*(.+)$/i);
    if (energy && !rawNutrition.energy) {
      const parsed = parseEnergy(energy[1]);
      if (parsed) {
        rawNutrition.energy = parsed;
        foundNutritionLine = true;
      }
    }

    for (const [key, pattern] of patterns) {
      const match = line.match(pattern);
      if (match && !rawNutrition[key]) {
        const parsed = parseNutrientValue(match[1], key === "sodium" ? ["mg", "g"] : ["g", "mg"]);
        if (parsed) {
          rawNutrition[key] = parsed;
          foundNutritionLine = true;
        }
      }
    }
  }

  const basisFlags = {
    per100g: /\bper\s*100\s*g\b|\bper\s*100g\b/i.test(fullText),
    per100ml: /\bper\s*100\s*ml\b/i.test(fullText),
    perServing: /\bper\s+serv(?:ing|e)\b|\bper\s+portion\b/i.test(fullText)
  };
  const basis = basisFlags.per100g && !basisFlags.perServing && !basisFlags.per100ml
    ? "per_100g"
    : basisFlags.perServing && !basisFlags.per100g && !basisFlags.per100ml
      ? "per_serving"
      : "unknown";

  return {
    rawNutrition,
    basis,
    source: foundNutritionLine ? "label_section" : null
  };
}

function parseEnergy(valueText) {
  const matches = [...valueText.matchAll(/(\d+(?:[.,]\d+)?)\s*(kcal|kj)\b/gi)];
  if (!matches.length) return null;
  const selected = matches.find(match => match[2].toLowerCase() === "kcal") || matches[0];
  return { value: parseNumber(selected[1]), unit: selected[2].toLowerCase() };
}

function parseNutrientValue(valueText, allowedUnits) {
  const pattern = new RegExp(`(\\d+(?:[.,]\\d+)?)\\s*(${allowedUnits.join("|")})\\b`, "i");
  const match = valueText.match(pattern);
  if (!match) return null;
  const value = parseNumber(match[1]);
  if (!Number.isFinite(value)) return null;
  return { value, unit: match[2].toLowerCase() };
}

function parseNumber(value) {
  const normalized = value.replace(",", ".");
  return Number(normalized);
}

function extractServingSize(lines) {
  for (const line of lines) {
    const match = line.match(/^serving\s*size\s*[:\-]?\s*(.+)$/i);
    if (match && match[1].trim()) return match[1].trim();
  }
  return null;
}

function buildWarnings(data) {
  const warnings = [];
  if (!data.productName) warnings.push("Product name was not identified from the OCR text.");
  if (!data.ingredients.length) warnings.push("No ingredients section was identified.");
  if (!data.explicitAllergens && data.allergens.length) {
    warnings.push("Allergens were inferred from ingredient terms; no explicit allergen statement was found.");
  } else if (!data.allergens.length) {
    warnings.push("No allergen terms were identified. This does not establish that the product is allergen-free.");
  }
  if (!Object.keys(data.rawNutrition).length) warnings.push("No nutrition values with recognized units were extracted.");
  if (Object.keys(data.rawNutrition).length && data.nutritionBasis === "unknown") {
    warnings.push("Nutrition basis is unknown; do not assume values are per 100 g or per serving.");
  }
  return warnings;
}

function uniqueCaseInsensitive(values) {
  const seen = new Set();
  return values.filter(value => {
    const key = value.toLocaleLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

module.exports = { extractLabelData, parseIngredientDetail, splitIngredients };
