// On-device OCR via Google ML Kit. Needs a dev build (npx expo run:android|ios): the native module is
// not in Expo Go. If it is unavailable, we return sample text so the review flow can still be tested.
import { SAMPLE_OCR_TEXT } from '../utils/mockData';

let TextRecognition = null;
try {
  TextRecognition = require('@react-native-ml-kit/text-recognition').default;
} catch (e) {
  TextRecognition = null;
}

/** @returns {Promise<{ text: string, mocked: boolean }>} */
export async function recognizeText(imageUri) {
  if (TextRecognition) {
    try {
      const result = await TextRecognition.recognize(imageUri);
      return { text: result.text || '', mocked: false };
    } catch (e) {
      // fall through to mock
    }
  }
  return { text: SAMPLE_OCR_TEXT, mocked: true };
}
