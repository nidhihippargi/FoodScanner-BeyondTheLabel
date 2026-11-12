'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { convertUnit, standardizeNutrientRepresentation } = require('../src/data-engine/cleaning/unit_standardiser');

test('mass conversion is deterministic', () => {
  assert.deepEqual(convertUnit(1.5, 'kg', 'g'), { value: 1500, unit: 'g', changed: true });
});
test('energy conversion uses the documented kcal/kJ factor', () => {
  assert.equal(convertUnit(1, 'kcal', 'kJ').value, 4.184);
});
test('dimensionally incompatible and salt/sodium conversions are rejected', () => {
  assert.throws(() => convertUnit(1, 'g', 'ml'), RangeError);
  assert.throws(() => convertUnit(1, 'salt', 'sodium'), RangeError);
});
test('standardisation adds a representation and preserves original value', () => {
  const input = { originalValue: { value: 1.2, unit: 'kg', basis: 'per_100g' }, standardizedValues: [], status: 'available', provenance: [] };
  const out = standardizeNutrientRepresentation(input, 'g');
  assert.equal(out.originalValue.value, 1.2);
  assert.deepEqual(out.standardizedValues, [{ value: 1200, unit: 'g', basis: 'per_100g' }]);
});
