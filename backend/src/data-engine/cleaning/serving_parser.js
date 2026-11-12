'use strict';

const UNIT_ALIASES = new Map([
  ['g','g'],['gram','g'],['grams','g'],['kg','kg'],['ml','ml'],['millilitre','ml'],['milliliter','ml'],
  ['l','l'],['litre','l'],['liter','l'],['mg','mg'],['piece','piece'],['pieces','piece'],['pc','piece'],['pcs','piece'],
  ['tablet','tablet'],['tablets','tablet'],['scoop','scoop'],['scoops','scoop'],
]);
function parseServingSize(rawText) {
  if (typeof rawText !== 'string' || !rawText.trim()) return { rawText: rawText ?? null, value: null, unit: null, status: 'missing', parseNote: 'No serving-size text supplied.' };
  const text = rawText.normalize('NFKC').trim();
  const match = text.match(/(?:per\s+|serving\s*size\s*[:=-]?\s*)?(\d+(?:[.,]\d+)?)\s*([a-zA-Zµμ]+)?/i);
  if (!match) return { rawText, value: null, unit: null, status: 'unverified', parseNote: 'No unambiguous numeric quantity and unit found.' };
  const value = Number(match[1].replace(',', '.'));
  const rawUnit = (match[2] || '').toLowerCase();
  const unit = UNIT_ALIASES.get(rawUnit) || (rawUnit ? rawUnit : null);
  if (!Number.isFinite(value) || value < 0 || !unit) {
    return { rawText, value: null, unit: null, status: 'unverified', parseNote: 'Quantity or unit could not be interpreted safely.' };
  }
  return { rawText, value, unit, status: 'unverified', parseNote: 'Parsed as metadata only; no per-100g or serving nutrition calculation was performed.' };
}

module.exports = { parseServingSize };
