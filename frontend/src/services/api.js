/**
 * Central API client for the Express/Node backend.
 *   POST /api/scan/barcode  { barcode }                    -> { found, parsedData, confidence, imageUri? }
 *   POST /api/scan/ocr      { rawText } | FormData(image)  -> { found, parsedData, confidence, imageUri? }
 *   POST /api/analyze       { parsedData, userPreferences } -> analysis object (shape documented in mockData.js)
 *
 * Flip USE_MOCK to false once the backend is running.
 */
import axios from 'axios';
import { Platform } from 'react-native';
import * as mock from './mockData';

export const API_CONFIG = {
  USE_MOCK: true,
  // Android emulator reaches the host machine at 10.0.2.2. On a real device use your LAN IP.
  BASE_URL: Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000',
  TIMEOUT_MS: 15000,
};

export class ApiError extends Error {
  constructor(message, { code = 'UNKNOWN', status = null, retryable = false } = {}) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.retryable = retryable;
  }
}

const client = axios.create({ baseURL: API_CONFIG.BASE_URL, timeout: API_CONFIG.TIMEOUT_MS });

/** Convert any thrown value into a user-friendly ApiError. */
function toApiError(err) {
  if (err instanceof ApiError) return err;
  if (err.code === 'ECONNABORTED') {
    return new ApiError('The server took too long to respond. Check your connection and try again.', { code: 'TIMEOUT', retryable: true });
  }
  if (err.response) {
    const { status } = err.response;
    const serverMsg = err.response.data && err.response.data.message;
    return new ApiError(serverMsg || `The server returned an error (${status}).`, { code: 'HTTP', status, retryable: status >= 500 });
  }
  return new ApiError('Could not reach the server. Check your internet connection and try again.', { code: 'NETWORK', retryable: true });
}

async function request(realCall, mockCall) {
  try {
    if (API_CONFIG.USE_MOCK) return await mockCall();
    const res = await realCall();
    return res.data;
  } catch (err) {
    throw toApiError(err);
  }
}

export const scanBarcode = (barcode) =>
  request(() => client.post('/api/scan/barcode', { barcode }), () => mock.scanBarcode(barcode));

export const scanOcrText = (rawText) =>
  request(() => client.post('/api/scan/ocr', { rawText }), () => mock.scanOcr());

export const scanOcrImage = (imageUri) => {
  const form = new FormData();
  form.append('image', { uri: imageUri, name: 'label.jpg', type: 'image/jpeg' });
  return request(
    () => client.post('/api/scan/ocr', form, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => ({ data: { imageUri, ...r.data } })),
    () => mock.scanOcr(imageUri)
  );
};

export const analyze = (parsedData, userPreferences) =>
  request(() => client.post('/api/analyze', { parsedData, userPreferences }), () => mock.analyze(parsedData, userPreferences));
