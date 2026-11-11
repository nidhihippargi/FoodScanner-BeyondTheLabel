
/**
 * Extracts structured food-label information from cleaned OCR text.
 * This module processes text only; it does not perform OCR.
 */


function splitIngredients(text) {
  const ingredients = [];
  let current = "";
  let parenthesisDepth = 0;

  for (const character of text) {
    if (character === "(") {
      parenthesisDepth++;
    } else if (character === ")" && parenthesisDepth > 0) {
      parenthesisDepth--;
    }

    if (character === "," && parenthesisDepth === 0) {
      if (current.trim()) {
        ingredients.push(current.trim());
      }
      current = "";
    } else {
      current += character;
    }
  }

  if (current.trim()) {
    ingredients.push(current.trim());
  }

  return ingredients;
}


function extractLabelData(input) {
  if (typeof input !== "string" || !input.trim()) {
    return {
      success: false,
      ingredients: [],
      allergens: [],
      nutrition: {},
      servingSize: null,
      error: "OCR text must be a non-empty string."
    };
  }

  const text = input.replace(/\r\n/g, "\n");
  const lines = text
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean);

  const ingredients = [];
  const allergens = [];
  const nutrition = {};
  let servingSize = null;

  // Extract ingredients across multiple lines.
  const ingredientStart = lines.findIndex(line =>
    /^ingredients?\s*[:\-]/i.test(line)
  );

  if (ingredientStart !== -1) {
    const firstLine = lines[ingredientStart].replace(
      /^ingredients?\s*[:\-]\s*/i,
      ""
    );

    const ingredientLines = [firstLine];

    for (let i = ingredientStart + 1; i < lines.length; i++) {
      if (/^(contains|allergens?|nutrition|nutritional information|serving size)\b/i.test(lines[i])) {
        break;
      }

      ingredientLines.push(lines[i]);
    }

    ingredients.push(
  ...splitIngredients(ingredientLines.join(" "))
);
  }

 

// Extract explicit allergen statements.
const allergenPattern =
  /^(?:allergen(?:s)?(?:\s+information)?\s*:\s*)?(?:contains\s*:\s*|contains\s+)?(.+)$/i;

for (const line of lines) {
  const match = line.match(allergenPattern);

  if (
    /^(?:allergens?(?:\s+information)?|contains)\b/i.test(line)
  ) {
    const allergenText = match[1];

    allergens.push(
      ...allergenText
        .split(/,|\band\b/i)
        .map(item => item.trim())
        .filter(Boolean)
    );
  }
}



  // Extract nutrition values only when a unit is present.
  const nutritionPatterns = [
    ["energy", /energy\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*(kcal|kj)\b/i],
    ["protein", /protein\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*(g|mg)\b/i],
    ["carbohydrates", /carbohydrates?\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*(g|mg)\b/i],
    ["sugars", /sugars?\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*(g|mg)\b/i],
    ["fat", /(?:total\s+)?fat\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*(g|mg)\b/i],
    ["saturatedFat", /saturated\s+fat\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*(g|mg)\b/i],
    ["fiber", /(?:fiber|fibre)\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*(g|mg)\b/i],
    ["sodium", /sodium\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*(mg|g)\b/i]
  ];

  for (const line of lines) {
    for (const [key, pattern] of nutritionPatterns) {
      const match = line.match(pattern);

      if (match && nutrition[key] === undefined) {
        nutrition[key] = {
          value: Number(match[1]),
          unit: match[2].toLowerCase()
        };
      }
    }
  }

  // Extract serving size.
  const servingMatch = text.match(
    /serving\s*size\s*[:\-]?\s*([^\n]+)/i
  );

  if (servingMatch) {
    servingSize = servingMatch[1].trim();
  }

  return {
    success: true,
    ingredients: [...new Set(ingredients)],
    allergens: [...new Set(allergens)],
    nutrition,
    servingSize,
    error: null
  };
}

module.exports = { extractLabelData };
