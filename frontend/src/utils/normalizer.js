// Serving-size normalizer: converts between "as packaged" (per serving) and per 100 g/ml.

export const NUTRIENTS = [
  { key: 'calories', label: 'Calories', unit: 'kcal', decimals: 0 },
  { key: 'sugar', label: 'Total sugars', unit: 'g', decimals: 1 },
  { key: 'sodium', label: 'Sodium', unit: 'mg', decimals: 0 },
  { key: 'satFat', label: 'Saturated fat', unit: 'g', decimals: 1 },
];

// Traffic-light cut-offs per 100 g. PLACEHOLDER values (UK FSA-style) so the UI works today;
// swap for FSSAI/WHO values from the backend as they are finalised.
export const THRESHOLDS = {
  sugar: { amber: 5, red: 22.5 },
  sodium: { amber: 120, red: 600 },
  satFat: { amber: 1.5, red: 5 },
};

const scale = (values, factor) =>
  Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v * factor]));

/** Per-100 values, computed from per-serving if the product only has those. */
export function getPer100(n = {}) {
  if (n.per100) return n.per100;
  if (n.perServing && n.servingGrams) return scale(n.perServing, 100 / n.servingGrams);
  return null;
}

/** Per-serving values, computed from per-100 if needed. */
export function getPerServing(n = {}) {
  if (n.perServing) return n.perServing;
  if (n.per100 && n.servingGrams) return scale(n.per100, n.servingGrams / 100);
  return null;
}

/** 'green' | 'amber' | 'red' for a nutrient, judged on per-100 values so the toggle never changes colours. */
export function nutrientLevel(key, per100Value) {
  const t = THRESHOLDS[key];
  if (!t || per100Value == null) return null;
  if (per100Value > t.red) return 'red';
  if (per100Value > t.amber) return 'amber';
  return 'green';
}

/**
 * Builds rows for <NutritionTable />.
 * mode: 'packaged' | 'normalized'. Falls back to normalized when no serving data exists.
 */
export function getNutritionView(nutrition, mode) {
  const per100 = getPer100(nutrition);
  const perServing = getPerServing(nutrition);
  const canToggle = !!(per100 && perServing);
  const usePackaged = mode === 'packaged' && perServing;
  const values = usePackaged ? perServing : per100;
  if (!values) return { rows: [], basisLabel: 'No nutrition data', canToggle: false };

  const rows = NUTRIENTS.map((n) => ({
    ...n,
    value: values[n.key] == null ? null : Number(values[n.key].toFixed(n.decimals)),
    level: nutrientLevel(n.key, per100 ? per100[n.key] : null),
  }));
  const basisLabel = usePackaged ? `Per serving (${nutrition.servingLabel || 'as packaged'})` : 'Per 100 g / 100 ml';
  return { rows, basisLabel, canToggle };
}
