'use strict';

const { validateProductRecord, validateIngredientRecord, assertProductRecord } = require('../validation/validators');
const { ValidationError } = require('../errors');

function validateNonNegativeNumber(value, fieldName) {
  if (value === null || value === undefined) return { valid: true };
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return { valid: false, field: fieldName, message: 'Expected a finite, non-negative number or null.' };
  }
  return { valid: true };
}
function assertNonNegativeNumber(value, fieldName) {
  const result = validateNonNegativeNumber(value, fieldName);
  if (!result.valid) throw new ValidationError(result.message, { field: fieldName, value });
  return value;
}

module.exports = { validateProductRecord, validateIngredientRecord, assertProductRecord, validateNonNegativeNumber, assertNonNegativeNumber };
