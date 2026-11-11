
/**
 * FoodScanner - Beyond The Label
 * Image input validation.
 *
 * Checks basic image properties before preprocessing or OCR.
 */

const SUPPORTED_FORMATS = ["image/jpeg", "image/png", "image/webp"];

function validateImage(image) {
  if (!image || typeof image !== "object") {
    return {
      valid: false,
      error: "Image input must be an object."
    };
  }

  const { mimeType, width, height } = image;

  if (!SUPPORTED_FORMATS.includes(mimeType)) {
    return {
      valid: false,
      error: "Unsupported image format. Use JPEG, PNG or WebP."
    };
  }

  if (!Number.isInteger(width) || !Number.isInteger(height)) {
    return {
      valid: false,
      error: "Image width and height must be positive integers."
    };
  }

  if (width <= 0 || height <= 0) {
    return {
      valid: false,
      error: "Image dimensions must be greater than zero."
    };
  }

  return {
    valid: true,
    error: null,
    image: {
      mimeType,
      width,
      height,
      aspectRatio: Number((width / height).toFixed(3))
    }
  };
}

module.exports = { validateImage };
