/** Normalize provider-specific OCR response shapes to the Vision contract. */
function normalizeOcrResult(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return failure("OCR provider result must be an object.");
  }

  const candidates = [input.text, input.rawText, input.fullText];
  const text = candidates.find(value => typeof value === "string" && value.trim());
  if (!text) return failure("OCR provider result does not contain recognized text.");

  return {
    success: true,
    engine: typeof input.engine === "string" ? input.engine :
      (typeof input.provider === "string" ? input.provider : null),
    text,
    blocks: normalizeBlocks(input.blocks),
    confidence: normalizeConfidence(input.confidence),
    error: null
  };
}

function normalizeConfidence(input) {
  if (Number.isFinite(input)) return { overall: input };
  if (input && typeof input === "object" && Number.isFinite(input.overall)) {
    return { overall: input.overall };
  }
  return { overall: null };
}

function normalizeBlocks(blocks) {
  if (!Array.isArray(blocks)) return [];
  return blocks.flatMap(block => {
    if (typeof block === "string" && block.trim()) return [{ text: block }];
    if (!block || typeof block !== "object" || typeof block.text !== "string" || !block.text.trim()) return [];
    const normalized = { text: block.text };
    normalized.confidence = Number.isFinite(block.confidence) ? block.confidence : null;
    normalized.boundingBox = block.boundingBox && typeof block.boundingBox === "object"
      ? block.boundingBox
      : null;
    return [normalized];
  });
}

function failure(error) {
  return {
    success: false,
    engine: null,
    text: "",
    blocks: [],
    confidence: { overall: null },
    error
  };
}

module.exports = { normalizeOcrResult, normalizeConfidence, normalizeBlocks };
