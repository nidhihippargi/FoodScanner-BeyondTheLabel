// Client-side analysis helpers. They work on any product (barcode result OR OCR text),
// so highlights stay consistent whether the backend sent them or not.
import { SUGAR_ALIASES, PLAIN_SUGARS } from './sugarAliases';
import { ADDITIVES } from './additives';
import { getPer100, THRESHOLDS } from './normalizer';

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Longest alias first, each wrapped in "not a letter" boundaries.
const SUGAR_MATCHERS = [...SUGAR_ALIASES]
  .sort((a, b) => b.length - a.length)
  .map((alias) => ({ alias, re: new RegExp(`(^|[^a-z])${escapeRe(alias)}([^a-z]|$)`, 'i') }));

/** Splits "Flour, Sugar, Emulsifier (INS 471, Lecithin)" on top-level commas only. */
export function splitIngredients(text = '') {
  const cleaned = text.replace(/^\s*ingredients?\s*[:\-]?\s*/i, '').replace(/\s+/g, ' ').replace(/\.\s*$/, '').trim();
  const out = [];
  let depth = 0;
  let cur = '';
  for (const ch of cleaned) {
    if (ch === '(' || ch === '[') depth++;
    if (ch === ')' || ch === ']') depth = Math.max(0, depth - 1);
    if ((ch === ',' || ch === ';') && depth === 0) {
      if (cur.trim()) out.push(cur.trim());
      cur = '';
    } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

/** Returns [{ ingredient, alias, index, hidden, topThree }] for every ingredient containing a sugar alias. */
export function detectSugars(ingredients = []) {
  const found = [];
  ingredients.forEach((ingredient, index) => {
    const hit = SUGAR_MATCHERS.find((m) => m.re.test(ingredient));
    if (hit) {
      found.push({
        ingredient,
        alias: hit.alias,
        index,
        hidden: !PLAIN_SUGARS.includes(hit.alias),
        topThree: index < 3,
      });
    }
  });
  return found;
}

const CODE_RE = /\b(?:INS|E)[\s-]?(\d{3}[a-z]?)\b/gi;

/** Finds INS/E-numbers in free text and decodes them via the local table. */
export function detectAdditives(text = '') {
  const seen = new Set();
  const list = [];
  for (const m of text.matchAll(CODE_RE)) {
    const code = m[1].toLowerCase();
    if (seen.has(code)) continue;
    seen.add(code);
    const info = ADDITIVES[code] || {
      name: 'Not in local decoder',
      function: 'Unknown',
      risk: 'low',
      explanation: 'We could not decode this number offline. The backend can supply details.',
    };
    list.push({ code: `INS ${code.toUpperCase()}`, ...info });
  }
  return list;
}

/** Extracts the INS/E code from one ingredient string, if any (used to colour ingredient tags). */
export function additiveRiskForIngredient(ingredient) {
  const m = /\b(?:INS|E)[\s-]?(\d{3}[a-z]?)\b/i.exec(ingredient);
  return m ? (ADDITIVES[m[1].toLowerCase()]?.risk ?? 'low') : null;
}

/** Heuristic 0–100 score and traffic-light rating. Backend may override with `healthScore`. */
export function scoreProduct(product) {
  const ingredients = product.ingredients || [];
  const sugars = detectSugars(ingredients);
  const additives = product.additives || detectAdditives(ingredients.join(', '));
  const per100 = getPer100(product.nutrition) || {};

  let score = 100;
  score -= Math.min(30, sugars.length * 10);
  if (sugars.some((s) => s.topThree)) score -= 15;
  score -= Math.min(25, additives.reduce((a, x) => a + (x.risk === 'high' ? 10 : x.risk === 'moderate' ? 5 : 0), 0));
  if (per100.sugar > THRESHOLDS.sugar.red) score -= 15;
  else if (per100.sugar > THRESHOLDS.sugar.amber) score -= 5;
  if (per100.sodium > THRESHOLDS.sodium.red) score -= 10;
  if (per100.satFat > THRESHOLDS.satFat.red) score -= 10;

  score = Math.max(0, Math.min(100, score));
  return { score, rating: score >= 70 ? 'green' : score >= 45 ? 'amber' : 'red' };
}

/** Offline fallback for /api/analyze: builds a product object from raw (OCR) ingredient text. */
export function analyzeIngredientText(text) {
  const ingredients = splitIngredients(text);
  return {
    id: `ocr-${Date.now()}`,
    barcode: null,
    name: 'Scanned label',
    brand: 'From ingredient photo',
    image: null,
    source: 'ocr',
    claims: [],
    ingredients,
    additives: detectAdditives(text),
    allergens: [],
    nutrition: {},
  };
}
