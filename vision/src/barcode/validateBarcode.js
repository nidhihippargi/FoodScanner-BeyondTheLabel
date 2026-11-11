
/**
 * FoodScanner - Beyond The Label
 * Barcode validation utilities.
 *
 * Supports GTIN-8, UPC-A, EAN-13 and GTIN-14.
 */

function validateBarcode(barcode) {
  // Check input type
  if (typeof barcode !== "string") {
    return {
      valid: false,
      barcode: null,
      format: null,
      error: "Barcode must be a string."
    };
  }

  // Check for digits only
  if (!/^\d+$/.test(barcode)) {
    return {
      valid: false,
      barcode,
      format: null,
      error: "Barcode must contain digits only."
    };
  }

  // Identify barcode format
  const formats = {
    8: "GTIN-8",
    12: "UPC-A",
    13: "EAN-13",
    14: "GTIN-14"
  };

  const format = formats[barcode.length];

  if (!format) {
    return {
      valid: false,
      barcode,
      format: null,
      error: "Unsupported barcode length."
    };
  }

  // Separate the check digit
  const digits = barcode.split("").map(Number);
  const checkDigit = digits.pop();

  let sum = 0;

  // Calculate the GS1 check digit
  for (let i = digits.length - 1; i >= 0; i--) {
    const distanceFromRight = digits.length - 1 - i;
    const weight = distanceFromRight % 2 === 0 ? 3 : 1;

    sum += digits[i] * weight;
  }

  const calculatedCheckDigit = (10 - (sum % 10)) % 10;

  if (calculatedCheckDigit !== checkDigit) {
    return {
      valid: false,
      barcode,
      format,
      error: "Invalid barcode check digit."
    };
  }

  return {
    valid: true,
    barcode,
    format,
    error: null
  };
}

module.exports = { validateBarcode };
