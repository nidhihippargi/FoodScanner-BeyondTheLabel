'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Ajv2020 = require('ajv/dist/2020').default;
const addFormats = require('ajv-formats');
const { validateProductRecord, validateIngredientRecord } = require('../src/data-engine/validation/validators');
const product = require('./fixtures/products/synthetic_product.json');
const incomplete = require('./fixtures/products/incomplete_product.json');
const aliases = require('../../data-engineering/ingredient_aliases.json');

const ajv = new Ajv2020({ allErrors: true, strict: false }); addFormats(ajv);
const productSchema = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../data-engineering/schemas/product.schema.json'), 'utf8'));
const ingredientSchema = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../data-engineering/schemas/ingredient.schema.json'), 'utf8'));
const validateProduct = ajv.compile(productSchema); const validateIngredient = ajv.compile(ingredientSchema);

test('synthetic product fixture validates against canonical product schema', () => {
  assert.equal(validateProduct(product), true, JSON.stringify(validateProduct.errors));
  assert.equal(validateProductRecord(product).valid, true, JSON.stringify(validateProductRecord(product).errors));
});
test('incomplete product fixture is structurally valid while keeping missing fields explicit', () => {
  assert.equal(validateProduct(incomplete), true, JSON.stringify(validateProduct.errors));
  assert.equal(incomplete.productName.value, null);
  assert.equal(incomplete.brand.value, null);
});
test('all ingredient reference records validate against ingredient schema', () => {
  for (const item of aliases) {
    assert.equal(validateIngredient(item), true, `${item.ingredientId}: ${JSON.stringify(validateIngredient.errors)}`);
    assert.equal(validateIngredientRecord(item).valid, true, item.ingredientId);
  }
});
test('provenance reference validator rejects unknown source IDs', () => {
  const broken = structuredClone(product);
  broken.productName.provenance[0].sourceId = 'not-in-source-records';
  assert.equal(validateProductRecord(broken).valid, false);
});
