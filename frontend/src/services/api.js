// Central REST client. Endpoints (Node/Express backend):
//   POST /api/scan/barcode  { barcode }          -> product | 404
//   POST /api/scan/ocr      multipart image      -> { text }   (optional server-side OCR from the vision team)
//   POST /api/analyze       { text }             -> product
// While the backend is not ready, USE_MOCK serves data from utils/mockData.js.
import axios from 'axios';
import { BARCODE_DB, BARCODE_NOT_FOUND, SAMPLE_OCR_TEXT } from '../utils/mockData';
import { analyzeIngredientText, splitIngredients } from '../utils/analysis';

export const USE_MOCK = true; // flip to false when the backend is reachable
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3000'; // 10.0.2.2 = host machine from the Android emulator

const client = axios.create({ baseURL: BASE_URL, timeout: 10000 });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** Resolves to { found: true, product } or { found: false, barcode, message }. */
export async function lookupBarcode(barcode) {
  if (USE_MOCK) {
    await wait(600);
    const product = BARCODE_DB[barcode];
    return product ? { found: true, product } : BARCODE_NOT_FOUND(barcode);
  }
  try {
    const { data } = await client.post('/api/scan/barcode', { barcode });
    return { found: true, product: data.product || data };
  } catch (err) {
    if (err.response?.status === 404) return BARCODE_NOT_FOUND(barcode);
    // Backend unreachable: try Open Food Facts directly before giving up.
    const off = await lookupOpenFoodFacts(barcode);
    return off ? { found: true, product: off } : BARCODE_NOT_FOUND(barcode);
  }
}

/** Fallback: public Open Food Facts API, mapped to our product shape. */
export async function lookupOpenFoodFacts(barcode) {
  try {
    const { data } = await axios.get(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`, { timeout: 8000 });
    if (data.status !== 1) return null;
    const p = data.product;
    const n = p.nutriments || {};
    return {
      id: `off-${barcode}`,
      barcode,
      name: p.product_name || 'Unknown product',
      brand: p.brands || 'Unknown brand',
      image: p.image_front_small_url || null,
      claims: [],
      ingredients: splitIngredients(p.ingredients_text || ''),
      allergens: (p.allergens_tags || []).map((t) => t.replace(/^\w+:/, '')),
      tags: [],
      nutrition: {
        servingLabel: p.serving_size,
        servingGrams: parseFloat(p.serving_quantity) || undefined,
        per100: {
          calories: n['energy-kcal_100g'] ?? 0,
          sugar: n.sugars_100g ?? 0,
          sodium: (n.sodium_100g ?? 0) * 1000, // g -> mg
          satFat: n['saturated-fat_100g'] ?? 0,
        },
      },
    };
  } catch {
    return null;
  }
}

/** Sends confirmed ingredient text for analysis. Falls back to the on-device analyzer. */
export async function analyzeIngredients(text) {
  if (USE_MOCK) {
    await wait(500);
    return analyzeIngredientText(text);
  }
  try {
    const { data } = await client.post('/api/analyze', { text });
    return data.product || data;
  } catch {
    return analyzeIngredientText(text);
  }
}

/** Optional: server-side OCR (vision team). Returns raw text. */
export async function ocrViaBackend(imageUri) {
  if (USE_MOCK) return { text: SAMPLE_OCR_TEXT };
  const form = new FormData();
  form.append('image', { uri: imageUri, name: 'label.jpg', type: 'image/jpeg' });
  const { data } = await client.post('/api/scan/ocr', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  return data;
}
