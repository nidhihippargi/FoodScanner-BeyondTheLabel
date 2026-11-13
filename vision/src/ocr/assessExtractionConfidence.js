/**
 * Produce transparent rule-based extraction indicators.
 * These are heuristic evidence scores, not OCR probabilities or calibrated
 * confidence estimates. Provider OCR confidence is returned separately.
 */
function assessExtractionConfidence(evidence = {}) {
  const fields = {
    productName: scoreField(evidence.productName, evidence.productNameSource),
    ingredients: scoreField(evidence.ingredients, evidence.ingredientsSource),
    allergens: scoreField(evidence.allergens, evidence.allergensSource),
    nutrition: scoreField(evidence.nutrition, evidence.nutritionSource),
    servingSize: scoreField(evidence.servingSize, evidence.servingSizeSource)
  };
  const scores = Object.values(fields).filter(field => field.score !== null).map(field => field.score);
  return {
    method: "rule_based_heuristic",
    note: "Heuristic extraction evidence only; this is not OCR confidence or a probability of correctness.",
    overall: scores.length ? Number((scores.reduce((sum, score) => sum + score, 0) / 5).toFixed(2)) : null,
    fields
  };
}

function scoreField(value, source) {
  if (value === null || value === undefined || value === false || (Array.isArray(value) && value.length === 0)) {
    return { score: 0, level: "not_found", source: source || null };
  }
  let score = 0.65;
  if (source === "explicit_label") score = 0.98;
  else if (source === "label_section") score = 0.92;
  else if (source === "ingredient_inference") score = 0.78;
  else if (source === "heuristic_heading") score = 0.68;
  return {
    score,
    level: score >= 0.9 ? "high" : score >= 0.7 ? "medium" : "low",
    source: source || "pattern_match"
  };
}

module.exports = { assessExtractionConfidence };
