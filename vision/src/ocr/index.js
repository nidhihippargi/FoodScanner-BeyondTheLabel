const { assessExtractionConfidence } = require("./assessExtractionConfidence");
const { cleanOcrText } = require("./cleanOcrText");
const { detectAllergens } = require("./detectAllergens");
const { extractLabelData } = require("./extractLabelData");
const { normalizeOcrResult } = require("./normalizeOcrResult");
const { normalizeNutrition } = require("./normalizeNutrition");
const { processOcrResult } = require("./processOcrResult");

module.exports = {
  assessExtractionConfidence,
  cleanOcrText,
  detectAllergens,
  extractLabelData,
  normalizeOcrResult,
  normalizeNutrition,
  processOcrResult
};
