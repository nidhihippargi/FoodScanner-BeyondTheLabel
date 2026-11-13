const test = require("node:test");
const assert = require("node:assert/strict");
const { preprocessImage } = require("../src/image-processing/preprocessImage");

function sampleImage() {
  return {
    width: 2,
    height: 1,
    data: new Uint8ClampedArray([
      255, 0, 0, 255,
      0, 255, 0, 255
    ])
  };
}

test("validates raw RGBA input", () => {
  const result = preprocessImage({ width: 2, height: 1, data: new Uint8Array([1, 2]) });
  assert.equal(result.success, false);
});

test("rotates raw RGBA image data clockwise", () => {
  const image = {
    width: 1,
    height: 2,
    data: new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 255])
  };
  const result = preprocessImage(image, { rotation: 90 });
  assert.equal(result.success, true);
  assert.equal(result.image.width, 2);
  assert.equal(result.image.height, 1);
  assert.deepEqual([...result.image.data], [0, 255, 0, 255, 255, 0, 0, 255]);
});

test("crops the requested rectangle", () => {
  const result = preprocessImage(sampleImage(), { crop: { x: 1, y: 0, width: 1, height: 1 } });
  assert.deepEqual([...result.image.data], [0, 255, 0, 255]);
});

test("resizes while preserving aspect ratio", () => {
  const image = { width: 2, height: 1, data: new Uint8ClampedArray(8).fill(128) };
  const result = preprocessImage(image, { maxWidth: 1 });
  assert.equal(result.image.width, 1);
  assert.equal(result.image.height, 1);
});

test("applies brightness adjustment", () => {
  const result = preprocessImage(sampleImage(), { brightness: 10 });
  assert.equal(result.image.data[0], 255);
  assert.ok(result.image.data[1] > 0);
});

test("rejects invalid crop rectangles", () => {
  const result = preprocessImage(sampleImage(), { crop: { x: 1, y: 0, width: 2, height: 1 } });
  assert.equal(result.success, false);
  assert.match(result.error, /boundaries/);
});
