
const test = require("node:test");
const assert = require("node:assert/strict");

const { validateBarcode } = require("../src/barcode/validateBarcode");

test("accepts a valid EAN-13 barcode", () => {
  const result = validateBarcode("4006381333931");

  assert.equal(result.valid, true);
  assert.equal(result.format, "EAN-13");
  assert.equal(result.barcode, "4006381333931");
  assert.equal(result.error, null);
});

test("accepts a valid UPC-A barcode", () => {
  const result = validateBarcode("036000291452");

  assert.equal(result.valid, true);
  assert.equal(result.format, "UPC-A");
});

test("rejects an incorrect check digit", () => {
  const result = validateBarcode("4006381333932");

  assert.equal(result.valid, false);
  assert.equal(result.error, "Invalid barcode check digit.");
});

test("rejects unsupported barcode lengths", () => {
  const result = validateBarcode("12345");

  assert.equal(result.valid, false);
  assert.equal(result.error, "Unsupported barcode length.");
});

test("rejects letters and special characters", () => {
  const result = validateBarcode("40063813339A1");

  assert.equal(result.valid, false);
  assert.equal(result.error, "Barcode must contain digits only.");
});

test("rejects non-string input", () => {
  const result = validateBarcode(4006381333931);

  assert.equal(result.valid, false);
  assert.equal(result.barcode, null);
  assert.equal(result.error, "Barcode must be a string.");
});

test("accepts a valid GTIN-8 barcode", () => {
  const result = validateBarcode("96385074");

  assert.equal(result.valid, true);
  assert.equal(result.format, "GTIN-8");
});

test("accepts a valid GTIN-14 barcode", () => {
  const result = validateBarcode("10012345000017");

  assert.equal(result.valid, true);
  assert.equal(result.format, "GTIN-14");
});