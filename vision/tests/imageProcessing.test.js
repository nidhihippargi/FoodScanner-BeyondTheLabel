
const test = require("node:test");
const assert = require("node:assert/strict");

const { validateImage } = require("../src/image-processing/validateImage");

test("accepts a valid JPEG image", () => {
  const result = validateImage({
    mimeType: "image/jpeg",
    width: 1920,
    height: 1080
  });

  assert.equal(result.valid, true);
  assert.equal(result.image.aspectRatio, 1.778);
});

test("accepts a valid PNG image", () => {
  const result = validateImage({
    mimeType: "image/png",
    width: 1000,
    height: 1000
  });

  assert.equal(result.valid, true);
  assert.equal(result.image.aspectRatio, 1);
});

test("accepts a valid WebP image", () => {
  const result = validateImage({
    mimeType: "image/webp",
    width: 800,
    height: 600
  });

  assert.equal(result.valid, true);
});

test("rejects unsupported image formats", () => {
  const result = validateImage({
    mimeType: "image/gif",
    width: 800,
    height: 600
  });

  assert.equal(result.valid, false);
});

test("rejects missing image input", () => {
  const result = validateImage(null);

  assert.equal(result.valid, false);
});

test("rejects invalid image dimensions", () => {
  const result = validateImage({
    mimeType: "image/jpeg",
    width: 0,
    height: 600
  });

  assert.equal(result.valid, false);
});

test("rejects non-integer dimensions", () => {
  const result = validateImage({
    mimeType: "image/jpeg",
    width: 800.5,
    height: 600
  });

  assert.equal(result.valid, false);
});
