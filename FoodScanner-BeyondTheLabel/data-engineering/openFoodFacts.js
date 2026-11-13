'use strict';
const { buildProduct, splitIngredients } = require('./ocrParser');

const OFF_URL = (code) => `https://world.openfoodfacts.org/api/v0/product/${code}.json`;

function normalizeOffProduct(json, barcode) {
  if (!json || json.status !== 1 || !json.product) return null;
  const p = json.product;
  const nu = p.nutriments || {};
  const mg = (g) => (g === undefined || g === null || g === '' ? null : Math.round(Number(g) * 1000 * 10) / 10);
  const salt = nu.salt_100g !== undefined ? Number(nu.salt_100g) : null;
  const strip = (t) => String(t).replace(/^[a-z]{2}:/, '').replace(/-/g, ' ');
  const additives = (p.additives_tags || []).map((t) => `INS ${String(t).replace(/^en:e/i, '')}`);
  const qty = `${p.quantity || ''} ${p.product_name || ''}`;
  return buildProduct({
    barcode: barcode || p.code,
    name: p.product_name || p.generic_name || 'Unknown product',
    brand: p.brands ? String(p.brands).split(',')[0].trim() : null,
    source: 'openfoodfacts',
    per: /\b(ml|cl|l)\b/i.test(p.quantity || '') && !/\bg\b/i.test(p.quantity || '') ? '100ml' : '100g',
    servingSize: parseFloat(p.serving_quantity) || null,
    ingredientsText: p.ingredients_text || '',
    ingredients: splitIngredients(p.ingredients_text || ''),
    nutrition: {
      energyKcal: nu['energy-kcal_100g'], sugar: nu.sugars_100g, addedSugar: nu['added-sugars_100g'],
      sodium: nu.sodium_100g !== undefined ? mg(nu.sodium_100g) : salt !== null ? Math.round(salt * 400) : null,
      salt, fat: nu.fat_100g, saturatedFat: nu['saturated-fat_100g'], transFat: nu['trans-fat_100g'],
      carbs: nu.carbohydrates_100g, protein: nu.proteins_100g, fiber: nu.fiber_100g,
    },
    additives, allergens: (p.allergens_tags || []).map(strip),
    claims: (p.labels_tags || []).map(strip).filter((l) => /sugar|fat|sodium|preservative|natural|protein|fib/.test(l)),
    nutriscore: ['a', 'b', 'c', 'd', 'e'].includes(p.nutriscore_grade) ? p.nutriscore_grade : null,
    nova: p.nova_group, _q: qty,
  });
}

/** Never throws. Resolves to a normalized product or null. */
async function fetchProduct(barcode, opts = {}) {
  const f = opts.fetchImpl || (typeof fetch === 'function' ? fetch : null);
  if (!f) return null;
  const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), opts.timeoutMs || 6000) : null;
  try {
    const res = await f(OFF_URL(barcode), { signal: ctrl ? ctrl.signal : undefined, headers: { 'User-Agent': 'FoodScanner-BeyondTheLabel/1.0' } });
    if (!res || !res.ok) return null;
    return normalizeOffProduct(await res.json(), barcode);
  } catch (e) {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

module.exports = { fetchProduct, normalizeOffProduct, OFF_URL };
