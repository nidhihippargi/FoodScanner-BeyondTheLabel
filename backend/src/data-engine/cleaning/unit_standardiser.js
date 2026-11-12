'use strict';

const MASS_TO_GRAMS = Object.freeze({ g: 1, gram: 1, grams: 1, kg: 1000, mg: 0.001, mcg: 0.000001, 'µg': 0.000001, 'μg': 0.000001 });
const VOLUME_TO_ML = Object.freeze({ ml: 1, millilitre: 1, milliliter: 1, l: 1000, litre: 1000, liter: 1000 });
const ENERGY_TO_KJ = Object.freeze({ kj: 1, kcal: 4.184 });

function convertUnit(value, fromUnit, toUnit) {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new TypeError('Conversion value must be a finite number.');
  if (!fromUnit || !toUnit) throw new TypeError('Both source and target units are required.');
  const from = String(fromUnit).trim().toLowerCase();
  const to = String(toUnit).trim().toLowerCase();
  if (from === to) return { value, unit: toUnit, changed: false };
  for (const group of [MASS_TO_GRAMS, VOLUME_TO_ML, ENERGY_TO_KJ]) {
    if (Object.hasOwn(group, from) && Object.hasOwn(group, to)) {
      const converted = value * group[from] / group[to];
      return { value: Number(converted.toFixed(8)), unit: toUnit, changed: true };
    }
  }
  throw new RangeError(`Unsupported or dimensionally incompatible conversion: ${fromUnit} -> ${toUnit}.`);
}

/** Return an added representation; never mutate or replace the original source value. */
function standardizeNutrientRepresentation(nutrientField, targetUnit) {
  if (!nutrientField?.originalValue) throw new TypeError('A nutrient field with originalValue is required.');
  const original = nutrientField.originalValue;
  if (typeof original.value !== 'number' || !original.unit || !['per_100g', 'per_100ml', 'per_serving'].includes(original.basis)) {
    return { ...nutrientField, standardizedValues: [...(nutrientField.standardizedValues || [])] };
  }
  const converted = convertUnit(original.value, original.unit, targetUnit);
  const item = { value: converted.value, unit: converted.unit, basis: original.basis };
  const existing = nutrientField.standardizedValues || [];
  const next = existing.filter((entry) => !(entry.unit === item.unit && entry.basis === item.basis));
  next.push(item);
  return { ...nutrientField, standardizedValues: next };
}

module.exports = { convertUnit, standardizeNutrientRepresentation };
