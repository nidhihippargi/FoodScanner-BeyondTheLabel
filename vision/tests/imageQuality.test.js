
const test = require("node:test");
const assert = require("node:assert/strict");

const {
  assessImageQuality
} = require("../src/image-processing/assessImageQuality");

test("accepts an image with good quality measurements", () => {
  const result = assessImageQuality({
    width: 1920,
    height: 1080,
    brightness: 120,
    blurScore: 80
  });

  assert.equal(result.suitableForOCR, true);
  assert.deepEqual(result.issues, []);
});

test("flags images with low resolution", () => {
  const result = assessImageQuality({
    width: 320,
    height: 240
  });

  assert.equal(result.suitableForOCR, false);
  assert.ok(result.issues.some(issue => issue.includes("resolution")));
});

test("flags images that are too dark", () => {
  const result = assessImageQuality({
    width: 1920,
    height: 1080,
    brightness: 30
  });

  assert.ok(result.issues.some(issue => issue.includes("dark")));
});

test("flags overexposed images", () => {
  const result = assessImageQuality({
    width: 1920,
    height: 1080,
    brightness: 240
  });

  assert.ok(result.issues.some(issue => issue.includes("overexposed")));
});

test("flags blurry images", () => {
  const result = assessImageQuality({
    width: 1920,
    height: 1080,
    blurScore: 10
  });

  assert.ok(result.issues.some(issue => issue.includes("blurry")));
});

test("rejects invalid image dimensions", () => {
  const result = assessImageQuality({
    width: 0,
    height: 1080
  });

  assert.equal(result.suitableForOCR, false);
  assert.deepEqual(result.issues, ["Invalid image dimensions."]);
});

test("rejects missing image input", () => {
  const result = assessImageQuality(null);

  assert.equal(result.suitableForOCR, false);
});
