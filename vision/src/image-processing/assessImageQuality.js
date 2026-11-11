
/**
 * FoodScanner - Beyond The Label
 * Image quality assessment.
 *
 * Evaluates image metadata and reports whether
 * the image meets basic OCR preparation requirements.
 */

function assessImageQuality(image) {
  if (!image || typeof image !== "object") {
    return {
      suitableForOCR: false,
      issues: ["Invalid image input."]
    };
  }

  const { width, height, brightness, blurScore } = image;
  const issues = [];

  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width <= 0 ||
    height <= 0
  ) {
    return {
      suitableForOCR: false,
      issues: ["Invalid image dimensions."]
    };
  }

  // Basic resolution check
  if (width < 640 || height < 480) {
    issues.push("Image resolution may be too low for OCR.");
  }

  // Brightness is expected on a 0-255 scale.
  if (typeof brightness === "number") {
    if (brightness < 50) {
      issues.push("Image may be too dark.");
    } else if (brightness > 220) {
      issues.push("Image may be overexposed.");
    }
  }

  // Blur score is expected on a 0-100 scale.
  // Lower values indicate more blur.
  if (typeof blurScore === "number" && blurScore < 30) {
    issues.push("Image may be blurry.");
  }

  return {
    suitableForOCR: issues.length === 0,
    issues
  };
}

module.exports = { assessImageQuality };
