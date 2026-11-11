
const test = require("node:test");
const assert = require("node:assert/strict");

const { cleanOcrText } = require("../src/ocr/cleanOcrText");

test("cleans unnecessary spaces", () => {
  const result = cleanOcrText("  Ingredients:   Sugar   Salt  ");

  assert.equal(result.success, true);
  assert.equal(result.text, "Ingredients: Sugar Salt");
});

test("removes empty lines", () => {
  const result = cleanOcrText("Ingredients:\n\nSugar\n\nSalt");

  assert.deepEqual(result.lines, [
    "Ingredients:",
    "Sugar",
    "Salt"
  ]);
});

test("normalizes Windows line endings", () => {
  const result = cleanOcrText("Ingredients:\r\nSugar\r\nSalt");

  assert.equal(result.text, "Ingredients:\nSugar\nSalt");
});

test("preserves original words and order", () => {
  const result = cleanOcrText("Milk\nSoy Lecithin\nSugar");

  assert.equal(result.text, "Milk\nSoy Lecithin\nSugar");
});

test("rejects empty text", () => {
  const result = cleanOcrText("   ");

  assert.equal(result.success, false);
  assert.equal(result.text, "");
});

test("rejects non-string input", () => {
  const result = cleanOcrText(null);

  assert.equal(result.success, false);
  assert.equal(result.text, "");
});
