'use strict';

const LABELS = new Map([
  ['energy', 'energy_kj'], ['energy (kj)', 'energy_kj'], ['energy (kcal)', 'energy_kcal'], ['calories', 'energy_kcal'],
  ['total fat', 'fat'], ['fat', 'fat'], ['saturated fat', 'saturated_fat'], ['saturates', 'saturated_fat'],
  ['carbohydrate', 'carbohydrates'], ['carbohydrates', 'carbohydrates'], ['total carbohydrate', 'carbohydrates'],
  ['total sugars', 'sugars'], ['sugars', 'sugars'], ['sugar', 'sugars'],
  ['added sugars', 'added_sugars'], ['includes added sugars', 'added_sugars'],
  ['dietary fibre', 'fiber'], ['dietary fiber', 'fiber'], ['fibre', 'fiber'], ['fiber', 'fiber'],
  ['protein', 'protein'], ['proteins', 'protein'], ['salt', 'salt'], ['sodium', 'sodium'],
]);
function mapNutrientLabel(label) {
  if (typeof label !== 'string') return null;
  const normalized = label.normalize('NFKC').toLowerCase().replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim();
  return LABELS.get(normalized) || null;
}
module.exports = { mapNutrientLabel, LABELS };
