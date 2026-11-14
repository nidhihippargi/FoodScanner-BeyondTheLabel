
import { preprocessImage } from './imageProcessing';
import { BASE_URL } from './api';

export async function recognizeText(imageUri) {
  try {
    // 1. Resize and compress the captured image.
    const preparedImage = await preprocessImage(imageUri);

    // 2. Read the processed image.
    const response = await fetch(preparedImage.uri);

    if (!response.ok) {
      throw new Error('Could not read the captured image.');
    }

    const blob = await response.blob();

    // 3. Convert image to Base64 for the backend.
    const base64Image = await new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onloadend = () => {
        const result = reader.result;

        if (typeof result !== 'string' || !result.includes(',')) {
          reject(new Error('Could not encode image.'));
          return;
        }

        resolve(result.split(',')[1]);
      };

      reader.onerror = () => reject(new Error('Image reading failed.'));
      reader.readAsDataURL(blob);
    });

    // 4. Send image to the backend OCR endpoint.
    const ocrResponse = await fetch(
      `${BASE_URL}/api/ocr/recognize`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          base64Image,
          byteSize: blob.size,
        }),
      }
    );

    const result = await ocrResponse.json();

    if (!ocrResponse.ok || !result.success) {
      throw new Error(
        result.message ||
        result.error?.message ||
        'Food label recognition failed.'
      );
    }

    // 5. Preserve both raw OCR output and structured extraction.
    return {
      success: true,

      // Backward-compatible text property.
      text: result.cleanedText || result.text || result.rawText || '',

      rawText: result.rawText || result.text || '',
      cleanedText: result.cleanedText || '',

      parsedData: result.parsedData || null,

      blocks: result.blocks || [],

      confidence: result.confidence || null,
      extractionConfidence: result.extractionConfidence || null,

      warnings: Array.isArray(result.warnings)
        ? result.warnings
        : [],

      engine: result.engine || null,

      imageUri,
      mocked: false,
    };

  } catch (error) {
    console.error('OCR error:', error);

    return {
      success: false,
      text: '',
      rawText: '',
      cleanedText: '',
      parsedData: null,
      blocks: [],
      confidence: null,
      extractionConfidence: null,
      warnings: [],
      imageUri,
      mocked: false,
      error: error.message || 'Food label recognition failed.',
    };
  }
}
