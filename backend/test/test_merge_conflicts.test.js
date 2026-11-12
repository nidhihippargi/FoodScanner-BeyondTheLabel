 'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { mergeObservations } = require('../src/data-engine/merging/source_merger');
const { ConflictError } = require('../src/data-engine/errors');
function record({ sourceId, gtin = '8901234567890', name = 'Product', sugar = 10, basis = 'per_100g' }) {
  return {
    schemaVersion: '1.0.0', recordId: 'same-product',
    identifiers: { gtin: { value: gtin, status: 'available', provenance: [{ sourceId, extractionMethod: 'barcode_lookup' }] } },
    productName: { value: name, status: 'available', provenance: [{ sourceId, extractionMethod: 'barcode_lookup' }] },
    brand: { value: null, status: 'missing', provenance: [] },
    packageQuantity: { rawText: null, value: null, unit: 'unknown', status: 'missing', provenance: [] },
    ingredients: { rawText: 'Oats', language: 'en', status: 'available', provenance: [{ sourceId, extractionMethod: 'barcode_lookup' }] },
    nutrition: { declaredBasis: basis, servingSize: { rawText: null, value: null, unit: null, status: 'missing', provenance: [] }, nutrients: {
      sugars: { originalValue: { value: sugar, unit: 'g', basis }, standardizedValues: [{ value: sugar, unit: 'g', basis }], status: 'available', provenance: [{ sourceId, extractionMethod: 'barcode_lookup' }] }
    } },
    images: [], sourceRecords: [{ sourceId, sourceType: sourceId.startsWith('ocr') ? 'ocr' : 'open_food_facts', extractionMethod: sourceId.startsWith('ocr') ? 'ocr_extraction' : 'barcode_lookup', retrievedAt: '2026-11-12T00:00:00Z' }],
    conflicts: [], quality: { recordStatus: 'partial', missingFields: [], unverifiedFields: [] },
    createdAt: '2026-11-12T00:00:00Z', updatedAt: '2026-11-12T00:00:00Z'
  };
}
test('different GTINs cannot be merged', () => {
  assert.throws(() => mergeObservations(record({ sourceId: 'off-a' }), record({ sourceId: 'off-b', gtin: '8901234500000' })), ConflictError);
});
test('same nutrient value combines source provenance and standardised values', () => {
  const merged = mergeObservations(record({ sourceId: 'off-a' }), record({ sourceId: 'ocr-b' }));
  assert.equal(merged.nutrition.nutrients.sugars.provenance.length, 2);
  assert.equal(merged.sourceRecords.length, 2);
  assert.equal(merged.conflicts.length, 0);
});
test('different nutrient values remain as an explicit conflict', () => {
  const merged = mergeObservations(record({ sourceId: 'off-a', sugar: 10 }), record({ sourceId: 'ocr-b', sugar: 12 }));
  assert.equal(merged.nutrition.nutrients.sugars.status, 'conflicting');
  assert.equal(merged.conflicts[0].fieldPath, '/nutrition/nutrients/sugars');
  assert.deepEqual(merged.conflicts[0].candidates.map((x) => x.value.value), [10, 12]);
  assert.equal(merged.quality.recordStatus, 'conflicted');
});
test('different declared nutrition bases are recorded as a conflict, not overwritten', () => {
  const merged = mergeObservations(record({ sourceId: 'off-a', basis: 'per_100g' }), record({ sourceId: 'ocr-b', basis: 'per_serving' }));
  assert.equal(merged.nutrition.declaredBasis, 'per_100g');
  assert.ok(merged.conflicts.some((x) => x.fieldPath === '/nutrition/declaredBasis'));
});
