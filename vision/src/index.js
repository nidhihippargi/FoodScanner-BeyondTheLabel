
const barcode = require("./barcode");
const imageProcessing = require("./image-processing");
const ocr = require("./ocr");

const visionModule = {
  name: "foodscanner-vision",
  version: "1.0.0",
  barcode,
  imageProcessing,
  ocr
};

module.exports = visionModule;
