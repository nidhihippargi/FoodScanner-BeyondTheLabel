const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeOcrResult } = require("../src/ocr/normalizeOcrResult");
const { processOcrResult } = require("../src/ocr/processOcrResult");

test("normalizes provider text and engine metadata", () => {
  const result = normalizeOcrResult({ provider: "demo", rawText: "Ingredients: Wheat" });
  assert.equal(result.success, true);
  assert.equal(result.engine, "demo");
  assert.equal(result.text, "Ingredients: Wheat");
  assert.deepEqual(result.confidence, { overall: null });
});

test("normalizes string blocks and structured blocks", () => {
  const result = normalizeOcrResult({
    text: "Product Name: Oats",
    blocks: ["Product Name: Oats", { text: "Oats", confidence: 0.8, boundingBox: { x: 1, y: 2 } }, null]
  });
  assert.equal(result.blocks.length, 2);
  assert.equal(result.blocks[0].text, "Product Name: Oats");
  assert.equal(result.blocks[1].confidence, 0.8);
  assert.deepEqual(result.blocks[1].boundingBox, { x: 1, y: 2 });
});

test("does not invent OCR confidence", () => {
  const result = normalizeOcrResult({ text: "Ingredients: Wheat" });
  assert.equal(result.confidence.overall, null);
});

test("rejects non-object and empty provider results", () => {
  assert.equal(normalizeOcrResult(null).success, false);
  assert.equal(normalizeOcrResult({ text: " " }).success, false);
});

test("normalizes confidence only when a finite score is supplied", () => {
  assert.deepEqual(normalizeOcrResult({ text: "ok", confidence: 0.7 }).confidence, { overall: 0.7 });
  assert.deepEqual(normalizeOcrResult({ text: "ok", confidence: "0.7" }).confidence, { overall: null });
});

test("returns a safe failure for invalid provider results", () => {
  const result = processOcrResult({ provider: "demo", response: {} });
  assert.equal(result.success, false);
  assert.equal(result.parsedData, null);
  assert.equal(result.confidence.overall, null);
});
