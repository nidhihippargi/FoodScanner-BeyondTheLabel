const { cleanOcrText } = require("./cleanOcrText");
const { extractLabelData } = require("./extractLabelData");
const { normalizeOcrResult } = require("./normalizeOcrResult");

/** Process a provider-normalized OCR result through cleaning and extraction. */
function processOcrResult(providerResult) {
  const normalized = normalizeOcrResult(providerResult);
  if (!normalized.success) {
    return failure({
      engine: normalized.engine,
      rawText: "",
      cleanedText: "",
      blocks: normalized.blocks,
      confidence: normalized.confidence,
      error: normalized.error
    });
  }

  const cleaned = cleanOcrText(normalized.text);
  if (!cleaned.success) {
    return failure({
      engine: normalized.engine,
      rawText: normalized.text,
      cleanedText: "",
      blocks: normalized.blocks,
      confidence: normalized.confidence,
      error: cleaned.error
    });
  }

  const extracted = extractLabelData(cleaned.text, { confidence: normalized.confidence });
  if (!extracted.success) {
    return failure({
      engine: normalized.engine,
      rawText: normalized.text,
      cleanedText: cleaned.text,
      blocks: normalized.blocks,
      confidence: normalized.confidence,
      error: extracted.error
    });
  }

  return {
    success: true,
    engine: normalized.engine,
    rawText: normalized.text,
    cleanedText: cleaned.text,
    blocks: normalized.blocks,
    parsedData: extracted.parsedData,
    confidence: normalized.confidence,
    extractionConfidence: extracted.extractionConfidence,
    warnings: extracted.warnings,
    error: null
  };
}

function failure(data) {
  return {
    success: false,
    engine: data.engine || null,
    rawText: data.rawText || "",
    cleanedText: data.cleanedText || "",
    blocks: data.blocks || [],
    parsedData: null,
    confidence: data.confidence || { overall: null },
    extractionConfidence: null,
    warnings: [],
    error: data.error || "OCR processing failed."
  };
}

module.exports = { processOcrResult };
