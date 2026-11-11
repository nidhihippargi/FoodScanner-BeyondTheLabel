
/**
 * Cleans and normalizes text returned by ML Kit OCR.
 * Does not perform OCR recognition or guess ingredient names.
 */

function cleanOcrText(rawText) {
  if (typeof rawText !== "string" || !rawText.trim()) {
    return {
      success: false,
      text: "",
      lines: [],
      error: "OCR text must be a non-empty string."
    };
  }

  const lines = rawText
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map(line =>
      line
        .replace(/[ \t]+/g, " ")
        .trim()
    )
    .filter(line => line.length > 0);

  const cleanedText = lines.join("\n");

  return {
    success: true,
    text: cleanedText,
    lines
  };
}

module.exports = { cleanOcrText };
