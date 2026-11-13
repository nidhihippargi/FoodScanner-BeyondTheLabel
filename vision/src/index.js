const barcode = require("./barcode");
const foodLabel = require("./food-label");
const imageProcessing = require("./image-processing");
const ocr = require("./ocr");

const visionModule = {
  name: "foodscanner-vision",
  version: "1.0.0",
  barcode,
  foodLabel,
  imageProcessing,
  ocr,
  cleanOcrText: ocr.cleanOcrText,
  decodeBarcodeFromRgba: barcode.decodeBarcodeFromRgba,
  extractLabelData: ocr.extractLabelData,
  normalizeOcrResult: ocr.normalizeOcrResult,
  normalizeNutrition: ocr.normalizeNutrition,
  preprocessImage: imageProcessing.preprocessImage,
  processOcrResult: ocr.processOcrResult,
  validateFoodLabel: foodLabel.validateFoodLabel
};

module.exports = visionModule;
