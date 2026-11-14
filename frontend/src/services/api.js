
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { splitIngredients, detectAdditives } from '../utils/analysis';

/* ------------------------------------------------------------------ */
/* Backend configuration                                               */
/* ------------------------------------------------------------------ */

function resolveBaseUrl() {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, '');
  }

  const host =
    (Constants.expoConfig && Constants.expoConfig.hostUri) ||
    (Constants.expoGoConfig && Constants.expoGoConfig.debuggerHost);

  if (host) return `http://${host.split(':')[0]}:5000`;

  return Platform.OS === 'android'
    ? 'http://10.0.2.2:5000'
    : 'http://localhost:5000';
}

export const BASE_URL = resolveBaseUrl();

export class ApiError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'ApiError';
    this.code = options.code || 'SERVER_ERROR';
    this.retryable = options.retryable || false;
  }
}

function makeError(message, code) {
  return new ApiError(message, {
    code,
    retryable: ['NETWORK', 'TIMEOUT'].includes(code),
  });
}

async function timedFetch(url, options = {}, timeoutMs = 20000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: ctrl.signal,
    });
  } catch (e) {
    if (e && e.name === 'AbortError') {
      throw makeError(
        'The request timed out. Check your connection and try again.',
        'TIMEOUT'
      );
    }

    throw makeError(
      `Network error while contacting ${new URL(url).host}. Check your connection.`,
      'NETWORK'
    );
  } finally {
    clearTimeout(timer);
  }
}

async function request(
  path,
  {
    method = 'GET',
    body,
    timeoutMs = 20000,
    returnFullResponse = false,
  } = {}
) {
  const res = await timedFetch(
    `${BASE_URL}/api${path}`,
    {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    },
    timeoutMs
  ).catch((e) => {
    if (e.code === 'NETWORK') {
      throw makeError(
        `Cannot reach the backend at ${BASE_URL}. Is it running, and is your phone on the same Wi-Fi?`,
        'NETWORK'
      );
    }

    throw e;
  });

  const json = await res.json().catch(() => null);

  if (!res.ok || !json || json.success !== true) {
    throw makeError(
      json?.error?.message ||
        json?.message ||
        `Server error (${res.status})`,
      json?.error?.code || 'SERVER_ERROR'
    );
  }

  if (returnFullResponse) return json;

  return json.data ?? json.product ?? json;
}

/* ------------------------------------------------------------------ */
/* Open Food Facts                                                     */
/* ------------------------------------------------------------------ */

const OFF_BASE = 'https://world.openfoodfacts.org/api/v2/product';

const OFF_FIELDS = [
  'code',
  'product_name',
  'generic_name',
  'brands',
  'quantity',
  'serving_quantity',
  'ingredients_text',
  'additives_tags',
  'allergens_tags',
  'labels_tags',
  'nutriments',
  'nutriscore_grade',
  'nova_group',
].join(',');

const NOT_FOUND_MESSAGE =
  'Product not found in Open Food Facts database';

const numOrNull = (v) => {
  if (v === null || v === undefined || v === '') return null;

  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const round1 = (n) =>
  n === null ? null : Math.round(n * 10) / 10;

/** Split on top-level commas only. */
function splitOffIngredients(text) {
  if (!text) return [];

  const out = [];
  let depth = 0;
  let cur = '';

  for (const ch of String(text).replace(/\n/g, ' ')) {
    if (ch === '(' || ch === '[') depth += 1;
    if (ch === ')' || ch === ']') depth = Math.max(0, depth - 1);

    if ((ch === ',' || ch === ';') && depth === 0) {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }

  out.push(cur);

  return out
    .map((s) => s.trim().replace(/\.$/, ''))
    .filter(Boolean);
}

const cleanTag = (t) =>
  String(t).replace(/^[a-z]{2}:/, '').replace(/-/g, ' ').trim();

/** Convert Open Food Facts data to the frontend product schema. */
export function mapOffToParsedData(raw, barcode) {
  const nu = raw.nutriments || {};

  const salt = numOrNull(nu.salt_100g);
  const sodiumG = numOrNull(nu.sodium_100g);
  const kcal = numOrNull(nu['energy-kcal_100g']);
  const kj = numOrNull(nu.energy_100g);

  const ingredientsText = raw.ingredients_text || '';
  const quantity = raw.quantity || '';

  const isLiquid =
    /\d\s*(ml|cl|l)\b/i.test(quantity) &&
    !/\d\s*(g|kg)\b/i.test(quantity);

  return {
    barcode: String(barcode || raw.code || ''),
    name: raw.product_name || raw.generic_name || 'Unnamed product',
    brand: raw.brands
      ? String(raw.brands).split(',')[0].trim()
      : null,
    source: 'openfoodfacts',
    per: isLiquid ? '100ml' : '100g',
    servingSize: numOrNull(raw.serving_quantity),
    ingredientsText,
    ingredients: splitOffIngredients(ingredientsText),

    nutrition: {
      energyKcal:
        kcal !== null
          ? kcal
          : kj !== null
            ? Math.round(kj / 4.184)
            : null,

      sugar: numOrNull(nu.sugars_100g),
      addedSugar: numOrNull(nu['added-sugars_100g']),

      sodium:
        sodiumG !== null
          ? round1(sodiumG * 1000)
          : salt !== null
            ? Math.round(salt * 400)
            : null,

      salt,
      fat: numOrNull(nu.fat_100g),
      saturatedFat: numOrNull(nu['saturated-fat_100g']),
      transFat: numOrNull(nu['trans-fat_100g']),
      carbs: numOrNull(nu.carbohydrates_100g),
      protein: numOrNull(nu.proteins_100g),
      fiber: numOrNull(nu.fiber_100g),
    },

    additives: (raw.additives_tags || []).map(
      (t) => `INS ${String(t).replace(/^en:e/i, '')}`
    ),

    allergens: (raw.allergens_tags || []).map(cleanTag),

    claims: (raw.labels_tags || [])
      .map(cleanTag)
      .filter((l) =>
        /sugar|fat|sodium|salt|preservative|natural|protein|fib|msg/.test(l)
      ),

    nutriscore: ['a', 'b', 'c', 'd', 'e'].includes(raw.nutriscore_grade)
      ? raw.nutriscore_grade.toUpperCase()
      : null,

    nova: numOrNull(raw.nova_group),
    isDemo: false,
  };
}

/** Live Open Food Facts barcode lookup. */
export async function scanBarcode(barcodeInput) {
  const barcode = String(
    barcodeInput == null ? '' : barcodeInput
  ).replace(/\D/g, '');

  if (![8, 12, 13, 14].includes(barcode.length)) {
    throw makeError(
      'Barcode must be 8, 12, 13 or 14 digits.',
      'INVALID_BARCODE'
    );
  }

  const res = await timedFetch(
    `${OFF_BASE}/${barcode}.json?fields=${OFF_FIELDS}`,
    {
      headers: {
        Accept: 'application/json',
        'User-Agent':
          'FoodScanner-BeyondTheLabel/1.0 (student project)',
      },
    },
    15000
  ).catch((e) => {
    if (e.code === 'NETWORK') {
      throw makeError(
        'Could not reach Open Food Facts. Check your internet connection.',
        'NETWORK'
      );
    }

    throw e;
  });

  const json = await res.json().catch(() => null);

  if (
    json &&
    (json.status === 0 || json.status === 'product not found') &&
    !json.product
  ) {
    throw makeError(NOT_FOUND_MESSAGE, 'PRODUCT_NOT_FOUND');
  }

  if (res.status === 404) {
    throw makeError(NOT_FOUND_MESSAGE, 'PRODUCT_NOT_FOUND');
  }

  if (!res.ok || !json || !json.product) {
    throw makeError(
      `Open Food Facts returned an error (${res.status}). Please try again.`,
      'OFF_ERROR'
    );
  }

  const parsedData = mapOffToParsedData(json.product, barcode);

  return {
    barcode,
    product: parsedData,
    parsedData,
    source: 'openfoodfacts',
  };
}

/* ------------------------------------------------------------------ */
/* Backend API calls                                                    */
/* ------------------------------------------------------------------ */

export const scanOcr = (text, engineConfidence) =>
  request('/scan/ocr', {
    method: 'POST',
    body: { text, engineConfidence },
  });

export const analyze = (payload) =>
  request('/analyze', {
    method: 'POST',
    body: payload,
    returnFullResponse: true,
  });

export const health = () => request('/health');

export const USE_MOCK =
  process.env.EXPO_PUBLIC_USE_MOCK === 'true';

/** Fetch a product through the backend (MongoDB cache + Open Food Facts). */
export async function lookupBarcode(barcode) {
  const result = await request(
    `/products/${encodeURIComponent(String(barcode))}`
  );

  return {
    found: true,
    product: result,
    parsedData: result,
  };
}

/* ------------------------------------------------------------------ */
/* OCR nutrition conversion                                             */
/* ------------------------------------------------------------------ */

/**
 * Accept only an unambiguous serving size in grams or millilitres.
 * Examples: "50 g", "250ml".
 */
function parseServingSize(value) {
  if (typeof value !== 'string') return null;

  const match = /^\s*(\d+(?:[.,]\d+)?)\s*(g|ml)\s*$/i.exec(value);

  if (!match) return null;

  const amount = Number(match[1].replace(',', '.'));
  const unit = match[2].toLowerCase();

  if (!Number.isFinite(amount) || amount <= 0) return null;

  return {
    value: amount,
    unit,
    label: `${amount} ${unit}`,
  };
}

const NUTRIENT_MAPPING = {
  protein: 'protein',
  carbohydrates: 'carbohydrates',
  sugars: 'sugar',
  saturatedFat: 'saturatedFat',
  fat: 'fat',
  fiber: 'fiber',
  sodium: 'sodium',
  energy: 'energy',
};

/**
 * Prepare nutrition for the backend.
 * Unknown nutrition basis is deliberately excluded.
 */
function buildBackendNutrition(parsedData) {
  const basis = parsedData?.nutritionBasis;
  const rawNutrition = parsedData?.rawNutrition;

  if (!rawNutrition || typeof rawNutrition !== 'object') {
    return null;
  }

  let nutritionBasis;
  let servingSize;

  if (basis === 'per_100g') {
    nutritionBasis = 'per-100g';

    // The backend service requires a servingSize object even for
    // already-normalized per-100g nutrition. The normalizer ignores
    // its amount when the basis is per-100g.
    servingSize = { value: 100, unit: 'g' };
  } else if (basis === 'per_serving') {
    const parsedServing = parseServingSize(parsedData.servingSize);

    if (!parsedServing) return null;

    nutritionBasis = 'per-serving';
    servingSize = {
      value: parsedServing.value,
      unit: parsedServing.unit,
    };
  } else {
    return null;
  }

  const nutrition = {};

  for (const [visionKey, backendKey] of Object.entries(NUTRIENT_MAPPING)) {
    const item = rawNutrition[visionKey];

    if (
      !item ||
      typeof item.value !== 'number' ||
      !Number.isFinite(item.value) ||
      item.value < 0 ||
      !['g', 'mg', 'kcal', 'kj'].includes(
        String(item.unit || '').toLowerCase()
      )
    ) {
      continue;
    }

    nutrition[backendKey] = {
      value: item.value,
      unit: item.unit.toLowerCase(),
    };
  }

  if (Object.keys(nutrition).length === 0) return null;

  return {
    nutrition,
    nutritionBasis,
    servingSize,
  };
}

/* ------------------------------------------------------------------ */
/* Backend response -> ProductDetailScreen product                      */
/* ------------------------------------------------------------------ */

function getFrontendNutrition(backendNutrition) {
  if (!backendNutrition?.values) return {};

  const values = backendNutrition.values;

  const getValue = (key) => {
    const item = values[key];

    if (
      !item ||
      typeof item.value !== 'number' ||
      !Number.isFinite(item.value)
    ) {
      return null;
    }

    return item;
  };

  const sugar = getValue('sugar');
  const sodium = getValue('sodium');
  const saturatedFat = getValue('saturatedFat');
  const energy = getValue('energy');

  // Backend converts mg to g. The frontend nutrition table expects mg
  // for sodium, so convert it back for display.
  const sodiumMg =
    sodium?.unit === 'g'
      ? sodium.value * 1000
      : sodium?.unit === 'mg'
        ? sodium.value
        : null;

  // The frontend displays calories in kcal.
  const calories =
    energy?.unit === 'kcal'
      ? energy.value
      : energy?.unit === 'kj'
        ? energy.value / 4.184
        : null;

  return {
    per100: {
      calories,
      sugar: sugar?.unit === 'g' ? sugar.value : null,
      sodium: sodiumMg,
      satFat:
        saturatedFat?.unit === 'g'
          ? saturatedFat.value
          : null,
    },
  };
}

function mapBackendAnalysisToProduct(
  response,
  ingredientText,
  parsedData
) {
  const analysis = response?.analysis || {};
  const scoring = analysis.scoring || {};
  const backendProduct = response?.product || {};

  const ingredients = splitIngredients(ingredientText);

  const score =
    typeof scoring.score === 'number' &&
    Number.isFinite(scoring.score)
      ? scoring.score
      : null;

  const ratingMap = {
    Good: 'green',
    Moderate: 'amber',
    Poor: 'red',
    'Very Poor': 'red',
  };

  const product = {
    id: `ocr-${Date.now()}`,
    barcode: null,

    name:
      backendProduct.name ||
      parsedData?.productName ||
      'Scanned food product',

    brand: parsedData?.brand || 'From ingredient photo',
    image: null,
    source: 'ocr',

    ingredients,
    additives: detectAdditives(ingredientText),
    allergens: Array.isArray(parsedData?.allergens)
      ? parsedData.allergens
      : [],

    claims: Array.isArray(parsedData?.claims)
      ? parsedData.claims
      : [],

    nutrition: getFrontendNutrition(analysis.nutrition),

    // Preserve the full backend analysis for later screens or debugging.
    backendAnalysis: analysis,

    isDemo: false,
  };

  // Only attach a backend score when the backend actually calculated one.
  if (score !== null) {
    product.healthScore = score;
  }

  if (scoring.rating && ratingMap[scoring.rating]) {
    product.rating = ratingMap[scoring.rating];
  }

  return product;
}

/**
 * Analyze editable OCR ingredients and any trustworthy extracted nutrition.
 * Returns the flat product object expected by ProductDetailScreen.
 */
export async function analyzeIngredients(text, parsedData = null) {
  if (typeof text !== 'string' || !text.trim()) {
    throw makeError(
      'Please enter or correct the ingredient list before analysis.',
      'INVALID_INGREDIENTS'
    );
  }

  const payload = {
    productName:
      parsedData?.productName || 'Scanned food product',

    // Use the user's edited ingredient text, not the original OCR text.
    ingredients: text.trim(),

    claims: Array.isArray(parsedData?.claims)
      ? parsedData.claims
      : [],

    preferences: [],
  };

  const nutritionData = buildBackendNutrition(parsedData);

  // Do not send empty or unknown-basis nutrition to the backend.
  if (nutritionData) {
    payload.nutrition = nutritionData.nutrition;
    payload.nutritionBasis = nutritionData.nutritionBasis;
    payload.servingSize = nutritionData.servingSize;
  }

  const response = await analyze(payload);

  return mapBackendAnalysisToProduct(
    response,
    text.trim(),
    parsedData
  );
}
