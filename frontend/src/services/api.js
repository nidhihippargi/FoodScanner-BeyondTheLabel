import Constants from 'expo-constants';
import { Platform } from 'react-native';

/* ------------------------------------------------------------------ */
/* Backend (analysis, OCR-text parsing, history)                       */
/* ------------------------------------------------------------------ */

function resolveBaseUrl() {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, '');
  const host = (Constants.expoConfig && Constants.expoConfig.hostUri) || (Constants.expoGoConfig && Constants.expoGoConfig.debuggerHost);
  if (host) return `http://${host.split(':')[0]}:5000`;
  return Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://localhost:5000';
}
export const BASE_URL = resolveBaseUrl();

function makeError(message, code) {
  const e = new Error(message);
  e.code = code;
  return e;
}

async function timedFetch(url, options = {}, timeoutMs = 20000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: ctrl.signal });
  } catch (e) {
    if (e && e.name === 'AbortError') throw makeError('The request timed out. Check your connection and try again.', 'TIMEOUT');
    throw makeError(`Network error while contacting ${new URL(url).host}. Check your connection.`, 'NETWORK');
  } finally {
    clearTimeout(timer);
  }
}

async function request(path, { method = 'GET', body, timeoutMs = 20000 } = {}) {
  const res = await timedFetch(`${BASE_URL}/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  }, timeoutMs).catch((e) => {
    if (e.code === 'NETWORK') throw makeError(`Cannot reach the backend at ${BASE_URL}. Is it running, and is your phone on the same Wi-Fi?`, 'NETWORK');
    throw e;
  });
  const json = await res.json().catch(() => null);
  if (!json || json.success !== true) {
    throw makeError((json && json.error && json.error.message) || `Server error (${res.status})`, (json && json.error && json.error.code) || 'SERVER_ERROR');
  }
  return json.data;
}

/* ------------------------------------------------------------------ */
/* Open Food Facts (live, no fallback data)                            */
/* ------------------------------------------------------------------ */

const OFF_BASE = 'https://world.openfoodfacts.org/api/v2/product';
const OFF_FIELDS = [
  'code', 'product_name', 'generic_name', 'brands', 'quantity', 'serving_quantity', 'ingredients_text',
  'additives_tags', 'allergens_tags', 'labels_tags', 'nutriments', 'nutriscore_grade', 'nova_group',
].join(',');

const NOT_FOUND_MESSAGE = 'Product not found in Open Food Facts database';

const numOrNull = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const round1 = (n) => (n === null ? null : Math.round(n * 10) / 10);

/** Split on top-level commas only, so "Thickener (508, 412)" stays together. */
function splitIngredients(text) {
  if (!text) return [];
  const out = [];
  let depth = 0;
  let cur = '';
  for (const ch of String(text).replace(/\n/g, ' ')) {
    if (ch === '(' || ch === '[') depth += 1;
    if (ch === ')' || ch === ']') depth = Math.max(0, depth - 1);
    if ((ch === ',' || ch === ';') && depth === 0) { out.push(cur); cur = ''; } else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim().replace(/\.$/, '')).filter(Boolean);
}

const cleanTag = (t) => String(t).replace(/^[a-z]{2}:/, '').replace(/-/g, ' ').trim();

/**
 * Map a raw Open Food Facts product to the app's parsedData schema
 * (same shape the backend's /api/analyze and the verification engine expect).
 */
export function mapOffToParsedData(raw, barcode) {
  const nu = raw.nutriments || {};
  const salt = numOrNull(nu.salt_100g);
  const sodiumG = numOrNull(nu.sodium_100g);
  const kcal = numOrNull(nu['energy-kcal_100g']);
  const kj = numOrNull(nu.energy_100g);
  const ingredientsText = raw.ingredients_text || '';
  const quantity = raw.quantity || '';
  const isLiquid = /\d\s*(ml|cl|l)\b/i.test(quantity) && !/\d\s*(g|kg)\b/i.test(quantity);

  return {
    barcode: String(barcode || raw.code || ''),
    name: raw.product_name || raw.generic_name || 'Unnamed product',
    brand: raw.brands ? String(raw.brands).split(',')[0].trim() : null,
    source: 'openfoodfacts',
    per: isLiquid ? '100ml' : '100g',
    servingSize: numOrNull(raw.serving_quantity),
    ingredientsText,
    ingredients: splitIngredients(ingredientsText),
    nutrition: {
      energyKcal: kcal !== null ? kcal : kj !== null ? Math.round(kj / 4.184) : null,
      sugar: numOrNull(nu.sugars_100g),
      addedSugar: numOrNull(nu['added-sugars_100g']),
      sodium: sodiumG !== null ? round1(sodiumG * 1000) : salt !== null ? Math.round(salt * 400) : null, // mg
      salt,
      fat: numOrNull(nu.fat_100g),
      saturatedFat: numOrNull(nu['saturated-fat_100g']),
      transFat: numOrNull(nu['trans-fat_100g']),
      carbs: numOrNull(nu.carbohydrates_100g),
      protein: numOrNull(nu.proteins_100g),
      fiber: numOrNull(nu.fiber_100g),
    },
    additives: (raw.additives_tags || []).map((t) => `INS ${String(t).replace(/^en:e/i, '')}`),
    allergens: (raw.allergens_tags || []).map(cleanTag),
    claims: (raw.labels_tags || []).map(cleanTag).filter((l) => /sugar|fat|sodium|salt|preservative|natural|protein|fib|msg/.test(l)),
    nutriscore: ['a', 'b', 'c', 'd', 'e'].includes(raw.nutriscore_grade) ? raw.nutriscore_grade.toUpperCase() : null,
    nova: numOrNull(raw.nova_group),
    isDemo: false,
  };
}

/**
 * Live Open Food Facts lookup. Resolves { barcode, product, parsedData, source }.
 * Throws code PRODUCT_NOT_FOUND ("Product not found in Open Food Facts database") when the barcode is unknown.
 */
export async function scanBarcode(barcodeInput) {
  const barcode = String(barcodeInput == null ? '' : barcodeInput).replace(/\D/g, '');
  if (![8, 12, 13, 14].includes(barcode.length)) throw makeError('Barcode must be 8, 12, 13 or 14 digits.', 'INVALID_BARCODE');

  const res = await timedFetch(`${OFF_BASE}/${barcode}.json?fields=${OFF_FIELDS}`, {
    headers: { Accept: 'application/json', 'User-Agent': 'FoodScanner-BeyondTheLabel/1.0 (student project)' },
  }, 15000).catch((e) => {
    if (e.code === 'NETWORK') throw makeError('Could not reach Open Food Facts. Check your internet connection.', 'NETWORK');
    throw e;
  });

  // v2 answers unknown barcodes with HTTP 404 + { status: 0 }, so parse the body before judging res.ok.
  const json = await res.json().catch(() => null);
  if (json && (json.status === 0 || json.status === 'product not found') && !json.product) throw makeError(NOT_FOUND_MESSAGE, 'PRODUCT_NOT_FOUND');
  if (res.status === 404) throw makeError(NOT_FOUND_MESSAGE, 'PRODUCT_NOT_FOUND');
  if (!res.ok || !json || !json.product) throw makeError(`Open Food Facts returned an error (${res.status}). Please try again.`, 'OFF_ERROR');

  const parsedData = mapOffToParsedData(json.product, barcode);
  return { barcode, product: parsedData, parsedData, source: 'openfoodfacts' };
}

/* ------------------------------------------------------------------ */
/* Backend calls: OCR text parsing + scoring                           */
/* ------------------------------------------------------------------ */

export const scanOcr = (text, engineConfidence) => request('/scan/ocr', { method: 'POST', body: { text, engineConfidence } });
export const analyze = (payload) => request('/analyze', { method: 'POST', body: payload });
export const health = () => request('/health');