const test = require("node:test");
const assert = require("node:assert/strict");
const vision = require("../src");

test("exposes all Vision feature groups from the package root", () => {
  assert.equal(vision.name, "foodscanner-vision");
  assert.equal(typeof vision.barcode.decodeBarcodeFromRgba, "function");
  assert.equal(typeof vision.imageProcessing.preprocessImage, "function");
  assert.equal(typeof vision.ocr.processOcrResult, "function");
  assert.equal(typeof vision.foodLabel.validateFoodLabel, "function");
});

test("exposes convenience OCR and validation functions from the package root", () => {
  assert.equal(typeof vision.cleanOcrText, "function");
  assert.equal(typeof vision.extractLabelData, "function");
  assert.equal(typeof vision.normalizeOcrResult, "function");
  assert.equal(typeof vision.normalizeNutrition, "function");
  assert.equal(typeof vision.preprocessImage, "function");
  assert.equal(typeof vision.processOcrResult, "function");
  assert.equal(typeof vision.validateFoodLabel, "function");
});
