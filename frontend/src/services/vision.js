let TextRecognition = null;
try {
  TextRecognition = require('@react-native-ml-kit/text-recognition').default;
} catch (e) {}

let cleanOcrText = (t) => (t || '').trim();
let extractLabelData = (t) => ({ rawText: t, ingredients: t, nutrition: {} });
try {
  const ocrMod = require('foodscanner-vision/src/ocr');
  cleanOcrText = ocrMod.cleanOcrText || cleanOcrText;
  extractLabelData = ocrMod.extractLabelData || extractLabelData;
} catch (e) {}

import { preprocessImage } from './imageProcessing';

/**
 * Complete food-label OCR pipeline.
 */
export async function recognizeFoodLabel(imageUri) {
  try {
    // Step 1: Prepare image
    const preparedImage = await preprocessImage(imageUri);

    // Step 2: Recognize text using Google ML Kit
    const ocrResult = await TextRecognition.recognize(
      preparedImage.uri
    );

    // Step 3: Get raw recognized text
    const rawText = ocrResult.text || '';

    if (!rawText.trim()) {
      return {
        success: false,
        error: 'No text detected in the image.',
        rawText: '',
        data: null,
      };
    }

    // Step 4: Clean recognized text
    const cleaned = cleanOcrText(rawText);

    if (!cleaned.success) {
      return {
        success: false,
        error: cleaned.error,
        rawText,
        data: null,
      };
    }

    // Step 5: Extract structured food-label information
    const extractedData = extractLabelData(cleaned.text);

    return {
      success: extractedData.success,
      rawText,
      cleanedText: cleaned.text,
      blocks: ocrResult.blocks?.map(block => block.text) || [],
      data: extractedData,
      error: extractedData.error || null,
    };

  } catch (error) {
    return {
      success: false,
      error: error.message || 'Food label recognition failed.',
      rawText: '',
      data: null,
    };
  }
}