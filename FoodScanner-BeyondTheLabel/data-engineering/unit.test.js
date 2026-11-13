'use strict';
const test = require('node:test');
const assert = require('node:assert');
const de = require('./index');

const LABEL = `Crunchy Oats
Nutrition Facts per 100 g
Energy 1800 kJ
Protein 9 g
Carbohydrate 62 g
Total Sugars 12.5 g
Added Sugars 10 g
Total Fat 14 g
Saturated Fat 6 g
Trans Fat 0.1 g
Dietary Fibre 7 g
Sodium 420 mg
Ingredients: Oats, Sugar, Palm oil, Acidity regulator (330), Colour (150d), Flavour enhancers (627, 631).
Contains: Wheat, Milk
Healthy & No Added Sugar`;

test('parseOcrText extracts nutrition, ingredients, additives, allergens, claims', () => {
  const p = de.parseOcrText(LABEL);
  assert.strictEqual(p.name, 'Crunchy Oats');
  assert.strictEqual(p.nutrition.energyKcal, 430);
  assert.strictEqual(p.nutrition.sugar, 12.5);
  assert.strictEqual(p.nutrition.addedSugar, 10);
  assert.strictEqual(p.nutrition.fat, 14);
  assert.strictEqual(p.nutrition.saturatedFat, 6);
  assert.strictEqual(p.nutrition.sodium, 420);
  assert.strictEqual(p.nutrition.fiber, 7);
  assert.ok(p.ingredients.length >= 4);
  assert.ok(['INS 330', 'INS 150d', 'INS 627', 'INS 631'].every((a) => p.additives.includes(a)));
  assert.deepStrictEqual(p.allergens, ['wheat', 'milk']);
  assert.ok(p.claims.includes('healthy') && p.claims.includes('no added sugar'));
});

test('per-serving labels are normalised to per-100g', () => {
  const p = de.parseOcrText('Serving size 50 g\nPer serving\nSugar 10 g\nSodium 200 mg');
  assert.strictEqual(p.nutrition.sugar, 20);
  assert.strictEqual(p.nutrition.sodium, 400);
});

test('splitIngredients keeps bracketed groups together', () => {
  assert.deepStrictEqual(de.splitIngredients('Flour, Thickener (508, 412), Salt.'), ['Flour', 'Thickener (508, 412)', 'Salt']);
});

test('normalizeOffProduct maps Open Food Facts JSON to canonical schema', () => {
  const json = { status: 1, product: { product_name: 'Test', brands: 'Acme, X', nutriments: { 'energy-kcal_100g': 100, sugars_100g: 5, sodium_100g: 0.4, fat_100g: 2, 'saturated-fat_100g': 1, proteins_100g: 3 }, additives_tags: ['en:e330'], allergens_tags: ['en:milk'], nutriscore_grade: 'c', nova_group: 4, ingredients_text: 'Milk, Sugar' } };
  const p = de.normalizeOffProduct(json, '123');
  assert.strictEqual(p.nutrition.sodium, 400);
  assert.strictEqual(p.brand, 'Acme');
  assert.deepStrictEqual(p.additives, ['INS 330']);
  assert.strictEqual(p.nutriscore, 'C');
  assert.strictEqual(de.normalizeOffProduct({ status: 0 }), null);
});

test('getProductByBarcode: live success, live failure -> mock fallback, unknown -> null', async () => {
  const okFetch = async () => ({ ok: true, json: async () => ({ status: 1, product: { product_name: 'Live', nutriments: {} } }) });
  assert.strictEqual((await de.getProductByBarcode('8901058851298', { fetchImpl: okFetch })).source, 'openfoodfacts');
  const badFetch = async () => { throw new Error('offline'); };
  const r = await de.getProductByBarcode('8901058851298', { fetchImpl: badFetch });
  assert.strictEqual(r.source, 'mock');
  assert.match(r.product.name, /Maggi/);
  assert.strictEqual(await de.getProductByBarcode('0000000000000', { offline: true }), null);
});

test('all mock products satisfy the canonical schema', () => {
  for (const p of Object.values(de.MOCK_PRODUCTS)) {
    assert.ok(p.barcode && p.name && p.nutrition && Array.isArray(p.additives) && Array.isArray(p.ingredients));
  }
  assert.ok(de.MOCK_PRODUCTS['8901058851298']);
});
