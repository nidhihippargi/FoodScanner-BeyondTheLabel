const test = require("node:test");
const assert = require("node:assert/strict");
const { decodeBarcodeFromRgba } = require("../src/barcode/decodeBarcode");

const L = ["0001101", "0011001", "0010011", "0111101", "0100011", "0110001", "0101111", "0111011", "0110111", "0001011"];
const G = ["0100111", "0110011", "0011011", "0100001", "0011101", "0111001", "0000101", "0010001", "0001001", "0010111"];
const R = ["1110010", "1100110", "1101100", "1000010", "1011100", "1001110", "1010000", "1000100", "1001000", "1110100"];
const PARITY = ["LLLLLL", "LLGLGG", "LLGGLG", "LLGGGL", "LGLLGG", "LGGLLG", "LGGGLL", "LGLGLG", "LGLGGL", "LGGLGL"];

function ean13Bits(value) {
  const digits = value.split("").map(Number);
  let bits = "101";
  const parity = PARITY[digits[0]];
  for (let index = 1; index <= 6; index++) bits += (parity[index - 1] === "L" ? L : G)[digits[index]];
  bits += "01010";
  for (let index = 7; index <= 12; index++) bits += R[digits[index]];
  return bits + "101";
}

function ean8Bits(value) {
  const digits = value.split("").map(Number);
  let bits = "101";
  for (let index = 0; index < 4; index++) bits += L[digits[index]];
  bits += "01010";
  for (let index = 4; index < 8; index++) bits += R[digits[index]];
  return bits + "101";
}

function renderBarcode(bits, scale = 3, height = 20) {
  const quiet = 10;
  const width = (bits.length + quiet * 2) * scale;
  const data = new Uint8ClampedArray(width * height * 4);
  data.fill(255);
  for (let y = 0; y < height; y++) {
    for (let bit = 0; bit < bits.length; bit++) {
      if (bits[bit] !== "1") continue;
      for (let offset = 0; offset < scale; offset++) {
        const pixel = (y * width + (quiet + bit) * scale + offset) * 4;
        data[pixel] = 0;
        data[pixel + 1] = 0;
        data[pixel + 2] = 0;
        data[pixel + 3] = 255;
      }
    }
  }
  return { width, height, data };
}

test("rejects invalid barcode image input", () => {
  const result = decodeBarcodeFromRgba(null);
  assert.equal(result.success, false);
  assert.equal(result.errorCode, "INVALID_IMAGE");
});

test("rejects RGBA buffers with an incorrect length", () => {
  const result = decodeBarcodeFromRgba({ width: 2, height: 2, data: new Uint8Array(4) });
  assert.equal(result.success, false);
  assert.match(result.error, /width × height × 4/);
});

test("decodes an EAN-13 barcode from RGBA pixels", () => {
  const result = decodeBarcodeFromRgba(renderBarcode(ean13Bits("4006381333931")));
  assert.equal(result.success, true);
  assert.equal(result.text, "4006381333931");
  assert.equal(result.format, "EAN-13");
  assert.equal(result.barcodeValidation.valid, true);
});

test("decodes a UPC-A barcode encoded as EAN-13 with leading zero", () => {
  const result = decodeBarcodeFromRgba(renderBarcode(ean13Bits("0036000291452")));
  assert.equal(result.success, true);
  assert.equal(result.text, "036000291452");
  assert.equal(result.format, "UPC-A");
});

test("decodes a GTIN-8 barcode from RGBA pixels", () => {
  const result = decodeBarcodeFromRgba(renderBarcode(ean8Bits("96385074")));
  assert.equal(result.success, true);
  assert.equal(result.text, "96385074");
  assert.equal(result.format, "GTIN-8");
});

test("returns a structured no-barcode result for a blank image", () => {
  const result = decodeBarcodeFromRgba({
    width: 8,
    height: 8,
    data: new Uint8ClampedArray(8 * 8 * 4).fill(255)
  });
  assert.equal(result.success, false);
  assert.equal(result.errorCode, "BARCODE_NOT_FOUND");
});
