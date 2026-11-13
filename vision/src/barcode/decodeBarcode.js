/**
 * Pure-JavaScript EAN-8, EAN-13 and UPC-A image decoder.
 *
 * Accepts decoded RGBA pixels so it stays independent of native image codecs.
 * Rotate/crop/resize the image with imageProcessing.preprocessImage first when
 * needed. This decoder does not currently decode QR, Code 128 or ITF-14 images.
 */
const { validateBarcode } = require("./validateBarcode");

const LEFT_L = [
  "0001101", "0011001", "0010011", "0111101", "0100011",
  "0110001", "0101111", "0111011", "0110111", "0001011"
];
const LEFT_G = [
  "0100111", "0110011", "0011011", "0100001", "0011101",
  "0111001", "0000101", "0010001", "0001001", "0010111"
];
const RIGHT_R = [
  "1110010", "1100110", "1101100", "1000010", "1011100",
  "1001110", "1010000", "1000100", "1001000", "1110100"
];
const FIRST_DIGIT_PARITY = [
  "LLLLLL", "LLGLGG", "LLGGLG", "LLGGGL", "LGLLGG",
  "LGGLLG", "LGGGLL", "LGLGLG", "LGLGGL", "LGGLGL"
];

function decodeBarcodeFromRgba(image) {
  if (!image || typeof image !== "object") {
    return failure("Image input must be an object containing RGBA pixel data.");
  }
  const { data, width, height } = image;
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    return failure("Image width and height must be positive integers.");
  }
  if (!(data instanceof Uint8Array) && !(data instanceof Uint8ClampedArray)) {
    return failure("Image data must be a Uint8Array or Uint8ClampedArray in RGBA order.");
  }
  if (data.length !== width * height * 4) {
    return failure("RGBA data length must equal width × height × 4.");
  }

  const rowsToTry = uniqueRows(height);
  for (const y of rowsToTry) {
    const gray = getGrayscaleRow(data, width, y);
    const threshold = otsuThreshold(gray);
    const binary = gray.map(value => value <= threshold ? 1 : 0);
    const runs = makeRuns(binary);
    for (let index = 0; index < runs.length - 2; index++) {
      if (runs[index].color !== 1 || runs[index + 1].color !== 0 || runs[index + 2].color !== 1) continue;
      const guardRuns = [runs[index], runs[index + 1], runs[index + 2]];
      const moduleWidth = guardRuns.reduce((sum, run) => sum + run.length, 0) / 3;
      if (moduleWidth < 0.8) continue;
      if (guardRuns.some(run => Math.abs(run.length - moduleWidth) > moduleWidth * 0.55)) continue;

      const startX = guardRuns[0].start;
      const ean13 = readModules(binary, startX, moduleWidth, 95);
      const decoded13 = ean13 && decodeEan13Bits(ean13);
      if (decoded13) return makeSuccess(decoded13.text, decoded13.format);

      const ean8 = readModules(binary, startX, moduleWidth, 67);
      const decoded8 = ean8 && decodeEan8Bits(ean8);
      if (decoded8) return makeSuccess(decoded8.text, decoded8.format);
    }
  }
  return failure("No valid EAN-8, EAN-13 or UPC-A barcode was decoded from the supplied image.", "BARCODE_NOT_FOUND");
}

function decodeEan13Bits(bits) {
  if (bits.length !== 95 || bits.slice(0, 3) !== "101" || bits.slice(45, 50) !== "01010" || bits.slice(92) !== "101") {
    return null;
  }
  let leftDigits = "";
  let parity = "";
  for (let position = 0; position < 6; position++) {
    const pattern = bits.slice(3 + position * 7, 10 + position * 7);
    let digit = LEFT_L.indexOf(pattern);
    if (digit !== -1) {
      leftDigits += String(digit);
      parity += "L";
    } else {
      digit = LEFT_G.indexOf(pattern);
      if (digit === -1) return null;
      leftDigits += String(digit);
      parity += "G";
    }
  }
  const firstDigit = FIRST_DIGIT_PARITY.indexOf(parity);
  if (firstDigit === -1) return null;

  let rightDigits = "";
  for (let position = 0; position < 6; position++) {
    const pattern = bits.slice(50 + position * 7, 57 + position * 7);
    const digit = RIGHT_R.indexOf(pattern);
    if (digit === -1) return null;
    rightDigits += String(digit);
  }

  let text = `${firstDigit}${leftDigits}${rightDigits}`;
  let format = "EAN-13";
  if (text.startsWith("0")) {
    text = text.slice(1);
    format = "UPC-A";
  }
  return { text, format };
}

function decodeEan8Bits(bits) {
  if (bits.length !== 67 || bits.slice(0, 3) !== "101" || bits.slice(31, 36) !== "01010" || bits.slice(64) !== "101") {
    return null;
  }
  let text = "";
  for (let position = 0; position < 4; position++) {
    const pattern = bits.slice(3 + position * 7, 10 + position * 7);
    const digit = LEFT_L.indexOf(pattern);
    if (digit === -1) return null;
    text += String(digit);
  }
  for (let position = 0; position < 4; position++) {
    const pattern = bits.slice(36 + position * 7, 43 + position * 7);
    const digit = RIGHT_R.indexOf(pattern);
    if (digit === -1) return null;
    text += String(digit);
  }
  return { text, format: "GTIN-8" };
}

function readModules(binary, startX, moduleWidth, count) {
  if (startX + moduleWidth * count > binary.length + moduleWidth * 0.25) return null;
  let bits = "";
  for (let index = 0; index < count; index++) {
    const sampleX = Math.min(binary.length - 1, Math.floor(startX + (index + 0.5) * moduleWidth));
    bits += binary[sampleX] ? "1" : "0";
  }
  return bits;
}

function getGrayscaleRow(data, width, y) {
  const values = new Uint8Array(width);
  for (let x = 0; x < width; x++) {
    const index = (y * width + x) * 4;
    const alpha = data[index + 3] / 255;
    const red = data[index] * alpha + 255 * (1 - alpha);
    const green = data[index + 1] * alpha + 255 * (1 - alpha);
    const blue = data[index + 2] * alpha + 255 * (1 - alpha);
    values[x] = Math.round(0.299 * red + 0.587 * green + 0.114 * blue);
  }
  return values;
}

function otsuThreshold(values) {
  const histogram = new Array(256).fill(0);
  for (const value of values) histogram[value]++;
  const total = values.length;
  let sum = 0;
  for (let value = 0; value < 256; value++) sum += value * histogram[value];
  let backgroundWeight = 0;
  let backgroundSum = 0;
  let bestVariance = -1;
  let threshold = 128;
  for (let value = 0; value < 256; value++) {
    backgroundWeight += histogram[value];
    if (backgroundWeight === 0) continue;
    const foregroundWeight = total - backgroundWeight;
    if (foregroundWeight === 0) break;
    backgroundSum += value * histogram[value];
    const backgroundMean = backgroundSum / backgroundWeight;
    const foregroundMean = (sum - backgroundSum) / foregroundWeight;
    const variance = backgroundWeight * foregroundWeight * (backgroundMean - foregroundMean) ** 2;
    if (variance > bestVariance) {
      bestVariance = variance;
      threshold = value;
    }
  }
  return threshold;
}

function makeRuns(binary) {
  if (!binary.length) return [];
  const runs = [];
  let start = 0;
  let color = binary[0];
  for (let index = 1; index <= binary.length; index++) {
    if (index === binary.length || binary[index] !== color) {
      runs.push({ color, start, length: index - start });
      start = index;
      color = binary[index];
    }
  }
  return runs;
}

function uniqueRows(height) {
  const rows = new Set();
  for (const ratio of [0.3, 0.4, 0.5, 0.6, 0.7]) rows.add(Math.min(height - 1, Math.max(0, Math.floor(height * ratio))));
  return [...rows];
}

function makeSuccess(text, format) {
  return {
    success: true,
    text,
    format,
    barcodeValidation: validateBarcode(text),
    error: null,
    errorCode: null
  };
}

function failure(error, errorCode = "INVALID_IMAGE") {
  return {
    success: false,
    text: null,
    format: null,
    barcodeValidation: null,
    error,
    errorCode
  };
}

module.exports = { decodeBarcodeFromRgba };
