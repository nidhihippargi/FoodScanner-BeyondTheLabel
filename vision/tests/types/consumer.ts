import vision from "../../src";
import { cleanOcrText, extractLabelData, processOcrResult, ParsedFoodLabel } from "../../src/ocr";
import { preprocessImage } from "../../src/image-processing";
import { decodeBarcodeFromRgba, BarcodeDecodeOptions } from "../../src/barcode";
import { validateFoodLabel } from "../../src/food-label";

const rgba: vision.RgbaImageInput = {
  data: new Uint8ClampedArray(4),
  width: 1,
  height: 1
};

const decodeOptions: BarcodeDecodeOptions = { tryHarder: true };
const barcodeResult: vision.BarcodeDecodeResult = decodeBarcodeFromRgba(rgba, decodeOptions);
const preparedImage: vision.PreprocessImageResult = preprocessImage(rgba, { rotation: 90 });
const cleanedText = cleanOcrText("Ingredients: Wheat flour");
const extracted = extractLabelData(cleanedText.text);
const parsed: ParsedFoodLabel | null = extracted.success ? extracted.parsedData : null;
const processed: vision.ProcessedOcrResult = processOcrResult({ text: cleanedText.text });
const validation: vision.FoodLabelValidationResult = validateFoodLabel(parsed);

void [barcodeResult, preparedImage, processed, validation];
