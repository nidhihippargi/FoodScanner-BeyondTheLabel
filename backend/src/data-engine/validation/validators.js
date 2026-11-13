'use strict';

const path = require('node:path');
const fs = require('node:fs');
const Ajv2020 = require('ajv/dist/2020').default;
const addFormats = require('ajv-formats');
const { ValidationError } = require('../errors');

const DATA_ENGINE_ROOT = path.resolve(__dirname, '../../../../');
const PRODUCT_SCHEMA_PATH = path.join(DATA_ENGINE_ROOT, 'data-engineering', 'schemas', 'product.schema.json');
const INGREDIENT_SCHEMA_PATH = path.join(DATA_ENGINE_ROOT, 'data-engineering', 'schemas', 'ingredient.schema.json');

function loadSchemas({ productSchemaPath = PRODUCT_SCHEMA_PATH, ingredientSchemaPath = INGREDIENT_SCHEMA_PATH } = {}) {
  return {
    product: JSON.parse(fs.readFileSync(productSchemaPath, 'utf8')),
    ingredient: JSON.parse(fs.readFileSync(ingredientSchemaPath, 'utf8')),
  };
}
let defaultValidators;
function createValidators(options = {}) {
  if (!options.schemas && !options.productSchemaPath && !options.ingredientSchemaPath && defaultValidators) return defaultValidators;
  const schemas = options.schemas || loadSchemas(options);
  const ajv = new Ajv2020({ allErrors: true, strict: false, validateFormats: true });
  addFormats(ajv);
  const compiled = { product: ajv.compile(schemas.product), ingredient: ajv.compile(schemas.ingredient) };
  if (!options.schemas && !options.productSchemaPath && !options.ingredientSchemaPath) defaultValidators = compiled;
  return compiled;
}
function validateProvenanceReferences(record) {
  const sourceIds = new Set((record.sourceRecords || []).map((item) => item.sourceId));
  const problems = [];
  const check = (entries, fieldPath) => {
    for (const entry of entries || []) {
      if (!sourceIds.has(entry.sourceId)) problems.push({ path: fieldPath, message: `Unknown provenance sourceId: ${entry.sourceId}` });
    }
  };
  const wrapped = [
    ['productName', record.productName], ['brand', record.brand], ['packageQuantity', record.packageQuantity],
    ['ingredients', record.ingredients], ['nutrition.servingSize', record.nutrition?.servingSize],
  ];
  for (const [name, obj] of wrapped) if (obj) check(obj.provenance, `/${name}/provenance`);
  for (const [name, obj] of Object.entries(record.nutrition?.nutrients || {})) check(obj.provenance, `/nutrition/nutrients/${name}/provenance`);
  for (const image of record.images || []) if (!sourceIds.has(image.sourceId)) problems.push({ path: '/images', message: `Unknown image sourceId: ${image.sourceId}` });
  for (const [index, conflict] of (record.conflicts || []).entries()) {
    for (const [candidateIndex, candidate] of (conflict.candidates || []).entries()) {
      if (!sourceIds.has(candidate.sourceId)) problems.push({ path: `/conflicts/${index}/candidates/${candidateIndex}/sourceId`, message: `Unknown conflict candidate sourceId: ${candidate.sourceId}` });
    }
  }
  return problems;
}
function validateProductRecord(record, options = {}) {
  const validator = options.validator || createValidators(options).product;
  const valid = validator(record);
  const errors = valid ? [] : (validator.errors || []).map((item) => ({ path: item.instancePath, keyword: item.keyword, message: item.message }));
  errors.push(...validateProvenanceReferences(record || {}));
  return { valid: errors.length === 0, errors };
}
function validateIngredientRecord(entry, options = {}) {
  const validator = options.validator || createValidators(options).ingredient;
  const valid = validator(entry);
  return { valid: Boolean(valid), errors: valid ? [] : (validator.errors || []).map((item) => ({ path: item.instancePath, keyword: item.keyword, message: item.message })) };
}
function assertProductRecord(record, options = {}) {
  const result = validateProductRecord(record, options);
  if (!result.valid) throw new ValidationError('Canonical product record failed validation.', { errors: result.errors });
  return record;
}

module.exports = { loadSchemas, createValidators, validateProductRecord, validateIngredientRecord, validateProvenanceReferences, assertProductRecord };
