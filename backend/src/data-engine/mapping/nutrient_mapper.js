'use strict';

const NUTRIENT_KEYS = Object.freeze({
  energy: ['energy_kj', 'kJ'], 'energy-kj': ['energy_kj', 'kJ'], 'energy-kcal': ['energy_kcal', 'kcal'],
  fat: ['fat', 'g'], 'saturated-fat': ['saturated_fat', 'g'], carbohydrates: ['carbohydrates', 'g'],
  sugars: ['sugars', 'g'], 'added-sugars': ['added_sugars', 'g'], fiber: ['fiber', 'g'], fibres: ['fiber', 'g'],
  proteins: ['protein', 'g'], protein: ['protein', 'g'], salt: ['salt', 'g'], sodium: ['sodium', 'mg'],
});
function basisFrom(value) {
  if (value === '100g' || value === 'per_100g') return 'per_100g';
  if (value === '100ml' || value === 'per_100ml') return 'per_100ml';
  if (value === 'serving' || value === 'per_serving') return 'per_serving';
  return 'unknown';
}
function nutrientRecord({ original, unit, originalBasis, standardized, sourceId, sourceField }) {
  const present = typeof original === 'number' && Number.isFinite(original);
  const std = [];
  for (const item of standardized) {
    if (typeof item.value === 'number' && Number.isFinite(item.value) && item.basis !== 'unknown') {
      std.push({ value: item.value, unit: item.unit || unit || null, basis: item.basis });
    }
  }
  return {
    originalValue: { value: present ? original : null, unit: unit || null, basis: originalBasis || 'unknown' },
    standardizedValues: std,
    status: present || std.length ? 'available' : 'missing',
    provenance: present || std.length ? [{ sourceId, extractionMethod: 'barcode_lookup', sourceField }] : [],
  };
}
function mapLegacyNutriments(product, sourceId) {
  const result = {};
  const nutriments = product.nutriments;
  if (!nutriments || typeof nutriments !== 'object') return result;
  for (const [offKey, [canonical, defaultUnit]] of Object.entries(NUTRIENT_KEYS)) {
    const unit = nutriments[`${offKey}_unit`] || defaultUnit;
    const original = typeof nutriments[`${offKey}_value`] === 'number' ? nutriments[`${offKey}_value`] :
      typeof nutriments[offKey] === 'number' ? nutriments[offKey] : null;
    const standardized = [];
    for (const [suffix, basis] of [['_100g', 'per_100g'], ['_100ml', 'per_100ml'], ['_serving', 'per_serving']]) {
      const v = nutriments[`${offKey}${suffix}`];
      if (typeof v === 'number' && Number.isFinite(v)) standardized.push({ value: v, unit: defaultUnit, basis });
    }
    if (original !== null || standardized.length) {
      result[canonical] = nutrientRecord({ original, unit, originalBasis: basisFrom(product.nutrition_data_per), standardized,
        sourceId, sourceField: `product.nutriments.${offKey}` });
    }
  }
  return result;
}
function mapStructuredNutrition(product, sourceId) {
  const result = {};
  const set = product.nutrition?.aggregated_set;
  if (!set || typeof set !== 'object' || !set.nutrients || typeof set.nutrients !== 'object') return result;
  const basis = basisFrom(set.per);
  for (const [offKey, payload] of Object.entries(set.nutrients)) {
    const mapping = NUTRIENT_KEYS[offKey];
    if (!mapping || !payload || typeof payload !== 'object') continue;
    const [canonical, defaultUnit] = mapping;
    const unit = payload.unit || defaultUnit;
    const original = typeof payload.value === 'number' ? payload.value : null;
    const computed = typeof payload.value_computed === 'number' ? payload.value_computed : null;
    const standardized = computed === null || basis === 'unknown' ? [] : [{ value: computed, unit, basis }];
    const mapped = nutrientRecord({ original, unit, originalBasis: basis, standardized, sourceId,
      sourceField: `product.nutrition.aggregated_set.nutrients.${offKey}` });
    if (!result[canonical]) result[canonical] = mapped;
    else if (mapped.status === 'available') result[canonical] = mapped;
  }
  return result;
}
function mapOffNutrients(product, sourceId) {
  // v3.5+ documents a structured nutrition set; the older nutriments block is retained as a compatibility fallback.
  const current = mapStructuredNutrition(product, sourceId);
  const legacy = mapLegacyNutriments(product, sourceId);
  return { ...legacy, ...current };
}

module.exports = { mapOffNutrients, NUTRIENT_KEYS, basisFrom };
