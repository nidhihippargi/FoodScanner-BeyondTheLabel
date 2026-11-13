'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeIngredientText } = require('../src/data-engine/cleaning/ingredient_cleaner');
const { parseServingSize } = require('../src/data-engine/cleaning/serving_parser');
const { deduplicateRecords } = require('../src/data-engine/cleaning/dedupe');

test('ingredient normalization preserves raw text and returns a comparison form', () => {
  const raw = '  OATS,  dates—ALMONDS\n';
  const result = normalizeIngredientText(raw);
  assert.equal(result.originalText, raw);
  assert.equal(result.normalizedText, 'oats, dates-almonds');
});

test('serving parser preserves the original expression and marks parse as unverified metadata', () => {
  const parsed = parseServingSize('Per 3 chips');
  assert.equal(parsed.rawText, 'Per 3 chips');
  assert.equal(parsed.value, 3);
  assert.equal(parsed.unit, 'chips');
  assert.equal(parsed.status, 'unverified');
});

test('serving parser does not invent a value when text is ambiguous', () => {
  const parsed = parseServingSize('one handful');
  assert.equal(parsed.value, null);
  assert.equal(parsed.status, 'unverified');
});

test('deduplication uses exact GTIN only', () => {
  const result = deduplicateRecords([
    { recordId: 'a', identifiers: { gtin: { value: '8901234567890' } } },
    { recordId: 'b', identifiers: { gtin: { value: '8901234567890' } } },
    { recordId: 'c', productName: { value: 'Same name' } },
  ]);
  assert.equal(result.unique.length, 2);
  assert.equal(result.duplicates.length, 1);
  assert.equal(result.duplicates[0].duplicateRecordId, 'b');
});
