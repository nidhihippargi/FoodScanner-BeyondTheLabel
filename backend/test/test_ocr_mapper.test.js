 'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { mapOcrPayload } = require('../src/data-engine/mapping/ocr_mapper');
const { ValidationError } = require('../src/data-engine/errors');

test('OCR fields remain unverified until the review step and preserve confidence', () => {
  const product = mapOcrPayload({
    requestId: 'ocr-1', capturedAt: '2026-11-12T00:00:00Z', barcode: '8901234567890',
    ingredients: { rawText: 'Oats, sugar', language: 'en', confidence: 0.99 },
    nutrition: { declaredBasis: 'per_100g', items: [{ sourceLabel: 'Total Sugars', value: 12, unit: 'g', basis: 'per_100g', confidence: 0.99 }] },
  }, { now: () => '2026-11-12T00:01:00Z' });
  assert.equal(product.identifiers.gtin.status, 'unverified');
  assert.equal(product.ingredients.status, 'unverified');
  assert.equal(product.nutrition.nutrients.sugars.status, 'unverified');
  assert.equal(product.ingredients.provenance[0].confidence, 0.99);
});
test('invalid OCR barcode is rejected', () => {
  assert.throws(() => mapOcrPayload({ barcode: 'abc', requestId: 'bad' }), ValidationError);
});
