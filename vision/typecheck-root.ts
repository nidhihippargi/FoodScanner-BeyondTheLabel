import vision from "./src";

const barcode = vision.barcode.validateBarcode("8901234567890");
const image = vision.imageProcessing.validateImage({
  mimeType: "image/jpeg",
  width: 1920,
  height: 1080
});

const ocr = vision.ocr.cleanOcrText("Ingredients: Wheat");

console.log(barcode, image, ocr);