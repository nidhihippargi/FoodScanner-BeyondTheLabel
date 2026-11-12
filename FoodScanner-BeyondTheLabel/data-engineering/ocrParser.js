'use strict';
/**
 * Canonical product schema + regex parser for raw OCR label text.
 * Every product in the system (OFF, mock, OCR, client-edited) goes through buildProduct().
 */
const { cleanOcrText } = require('../vision');

const NUTRIENT_KEYS = ['energyKcal', 'sugar', 'addedSugar', 'sodium', 'salt', 'fat', 'saturatedFat', 'transFat', 'carbs', 'protein', 'fiber'];

const num = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

function buildProduct(p = {}) {
  const n = p.nutrition || {};
  const nutrition = {};
  NUTRIENT_KEYS.forEach((k) => { nutrition[k] = num(n[k]); });
  const arr = (a) => (Array.isArray(a) ? a.map((x) => String(x).trim()).filter(Boolean) : []);
  const ingredientsText = typeof p.ingredientsText === 'string' ? p.ingredientsText : arr(p.ingredients).join(', ');
  return {
    barcode: p.barcode ? String(p.barcode) : null,
    name: p.name || 'Unknown product',
    brand: p.brand || null,
    source: p.source || 'manual',
    per: p.per === '100ml' ? '100ml' : '100g',
    servingSize: num(p.servingSize),
    ingredientsText,
    ingredients: arr(p.ingredients).length ? arr(p.ingredients) : splitIngredients(ingredientsText),
    nutrition,
    additives: arr(p.additives),
    allergens: arr(p.allergens).map((a) => a.toLowerCase()),
    claims: arr(p.claims).map((c) => c.toLowerCase()),
    nutriscore: p.nutriscore ? String(p.nutriscore).toUpperCase() : null,
    nova: num(p.nova),
    isDemo: Boolean(p.isDemo),
  };
}

/** Split on top-level commas only (keeps "Thickener (508, 412)" intact). */
function splitIngredients(text) {
  if (!text) return [];
  const out = []; let depth = 0; let cur = '';
  for (const ch of text.replace(/\n/g, ' ')) {
    if (ch === '(' || ch === '[') depth++;
    if (ch === ')' || ch === ']') depth = Math.max(0, depth - 1);
    if ((ch === ',' || ch === ';') && depth === 0) { out.push(cur); cur = ''; } else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim().replace(/\.$/, '')).filter(Boolean);
}

const CLASS_WORDS = '(?:thickeners?|acidity regulators?|humectants?|colou?rs?|colouring agents?|flavou?r enhancers?|preservatives?|emulsifiers?|antioxidants?|sweeteners?|raising agents?|stabili[sz]ers?|anti-?caking agents?|firming agents?|gelling agents?)';

/** Finds "E330", "INS 621", and "Class (508, 501(i))" style additives -> ["INS 330", ...] */
function extractAdditives(text) {
  const found = new Set();
  const t = String(text || '');
  const add = (code) => found.add(`INS ${code.toLowerCase()}`);
  for (const m of t.matchAll(/\b(?:E|INS)\s?-?(\d{3,4}[a-d]?)\b/gi)) add(m[1]);
  const re = new RegExp(`${CLASS_WORDS}\\s*\\(((?:[^()]|\\([^()]*\\))*)\\)`, 'gi');
  for (const m of t.matchAll(re)) {
    for (const c of m[1].matchAll(/\b(\d{3,4}[a-d]?)\b(?:\s*\([ivx]+\))?/gi)) add(c[1]);
  }
  return [...found];
}

const CLAIM_PHRASES = ['no added sugar', 'sugar free', 'zero sugar', 'low fat', 'fat free', 'low sodium', 'low calorie', 'no preservatives', 'no added msg', 'no msg', 'high protein', 'source of fibre', 'source of fiber', 'whole grain', '100% natural', 'natural', 'healthy', 'health drink', 'nutritious'];

function extractClaims(text) {
  const lower = String(text || '').toLowerCase();
  return CLAIM_PHRASES.filter((c) => new RegExp(`\\b${c.replace(/[%]/g, '\\%')}`, 'i').test(lower))
    .filter((c, _, all) => !(c === 'natural' && all.includes('100% natural')));
}

const VAL = '[^\\d\\n]{0,18}?(\\d+(?:\\.\\d+)?)\\s*';
const first = (text, re) => { const m = text.match(re); return m ? m : null; };

function parseOcrText(raw, opts = {}) {
  const text = cleanOcrText(raw);
  const n = {};

  const kcal = first(text, new RegExp(`(?:energy|calories)${VAL}(kcal|kj|cal)\\b`, 'i')) || first(text, /(\d+(?:\.\d+)?)\s*(kcal)\b/i);
  if (kcal) n.energyKcal = /kj/i.test(kcal[2]) ? Math.round(Number(kcal[1]) / 4.184) : Number(kcal[1]);

  const g = (re) => { const m = first(text, new RegExp(re + VAL + '(g|mg)\\b', 'i')); return m ? (/mg/i.test(m[2]) ? Number(m[1]) / 1000 : Number(m[1])) : null; };
  n.sugar = g('(?<!added\\s)(?:total\\s+)?sugars?');
  n.addedSugar = g('added\\s+sugars?');
  if (n.sugar === null && n.addedSugar !== null) n.sugar = n.addedSugar;
  n.fat = g('(?<!saturated\\s)(?<!trans\\s)(?<!sat\\.\\s)(?:total\\s+)?fat');
  n.saturatedFat = g('(?:saturated|sat\\.?)\\s+fat');
  n.transFat = g('trans\\s+fat');
  n.protein = g('proteins?');
  n.carbs = g('(?:total\\s+)?(?:carbohydrates?|carbs)');
  n.fiber = g('(?:dietary\\s+)?fib(?:er|re)');
  n.salt = g('salt');

  const sod = first(text, new RegExp(`sodium${VAL}(mg|g)\\b`, 'i'));
  if (sod) n.sodium = /mg/i.test(sod[2]) ? Number(sod[1]) : Number(sod[1]) * 1000;
  else if (n.salt !== null) n.sodium = Math.round(n.salt * 400);

  // Normalise per-serving labels to per-100g when serving size is known
  const per100 = /per\s*100\s*(g|ml)/i.exec(text);
  const serv = first(text, /serving\s*size[^\d\n]{0,12}(\d+(?:\.\d+)?)\s*(g|ml)/i);
  let per = per100 && /ml/i.test(per100[1]) ? '100ml' : '100g';
  let basisNote = per100 ? 'per 100 as printed' : 'assumed per 100';
  if (!per100 && /per\s*serv/i.test(text) && serv) {
    const f = 100 / Number(serv[1]);
    Object.keys(n).forEach((k) => { if (n[k] !== null && n[k] !== undefined) n[k] = Math.round(n[k] * f * 10) / 10; });
    per = /ml/i.test(serv[2]) ? '100ml' : '100g';
    basisNote = `converted from per-serving (${serv[1]} ${serv[2]})`;
  }

  const ing = first(text, /ingredients?\s*[:\-]\s*([\s\S]+?)(?=\n\s*\n|nutrition|nutritional|allergen|contains\s*:|manufactured|best before|$)/i);
  const ingredientsText = ing ? ing[1].replace(/\s*\n\s*/g, ' ').trim() : '';

  const allergens = [];
  const alg = first(text, /contains\s*[:\-]\s*([^\n.]+)/i);
  if (alg) alg[1].split(/,|\band\b/i).forEach((a) => a.trim() && allergens.push(a.trim().toLowerCase()));

  const firstLine = text.split('\n')[0] || '';
  const name = opts.name || (firstLine.length > 2 && firstLine.length < 40 && !/\d/.test(firstLine) && !/nutrition|ingredients/i.test(firstLine) ? firstLine : 'Scanned label');

  const product = buildProduct({
    name, source: 'ocr', per, servingSize: serv ? serv[1] : null, ingredientsText,
    nutrition: n, additives: extractAdditives(ingredientsText || text), allergens, claims: extractClaims(text),
  });
  product.basisNote = basisNote;
  product.fieldsFound = NUTRIENT_KEYS.filter((k) => product.nutrition[k] !== null).length;
  return product;
}

module.exports = { parseOcrText, buildProduct, splitIngredients, extractAdditives, extractClaims, NUTRIENT_KEYS };
