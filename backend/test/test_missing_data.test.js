'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { mapOffProduct } = require('../src/data-engine/mapping/off_mapper');
const incomplete = require('../../data-engineering/fixtures/off/product_incomplete.json');
const { computeQualitySummary } = require('../src/data-engine/quality/quality_checks');

test('missing values remain null and are not represented as numeric zero', () => {
  const record = mapOffProduct({ outcome: 'incomplete', barcode: incomplete.product.code, product: incomplete.product, warnings: [] });
  assert.equal(record.productName.value, null);
  assert.equal(record.brand.value, null);
  assert.equal(record.ingredients.rawText, null);
  assert.equal(record.nutrition.servingSize.value, null);
  assert.equal(record.quality.recordStatus, 'insufficient');
  assert.deepEqual(record.quality, computeQualitySummary(record));
});
