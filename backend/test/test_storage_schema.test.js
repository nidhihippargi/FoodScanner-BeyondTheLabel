 'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { COLLECTION_DEFINITIONS } = require('../src/data-engine/storage/mongo_schema');

test('storage schema declares products, aliases and sources collections', () => {
  assert.deepEqual(COLLECTION_DEFINITIONS.map((x) => x.name), ['products', 'ingredient_aliases', 'data_sources']);
});
test('product collection has record-id and partial GTIN indexes', () => {
  const products = COLLECTION_DEFINITIONS.find((x) => x.name === 'products');
  assert.ok(products.indexes.some((x) => x.options.unique && x.key.recordId === 1));
  assert.ok(products.indexes.some((x) => x.options.unique && x.options.partialFilterExpression));
});
test('alias collection indexes the canonical name and alias values', () => {
  const aliases = COLLECTION_DEFINITIONS.find((x) => x.name === 'ingredient_aliases');
  assert.ok(aliases.indexes.some((x) => x.key.canonicalName === 1));
  assert.ok(aliases.indexes.some((x) => x.key['aliases.name'] === 1));
});
