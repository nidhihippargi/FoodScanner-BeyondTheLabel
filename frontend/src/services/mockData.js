/**
 * Mock backend. Mirrors the REST contract so screens work with no server.
 * Demo barcodes: 0000000000000 -> "not found", 9999999999999 -> simulated network error,
 * anything else -> sample products (picked by last digit).
 *
 * parsedData shape:
 *   { productName, servingSize: {value, unit}|null, ingredients, claims: string[],
 *     nutrition: { [key]: number|null } }   // null = NOT REPORTED, 0 = genuine zero
 *
 * analysis shape:
 *   { productName, servingSize, comparison[], normalizationWarning, sugarAliases[],
 *     claims[], preferenceFlags[], highlights[], missingFields[] }
 */
import { ApiError } from './api';
import { NUTRIENTS } from '../utils/normalizer';

function normalizeToPer100(value, servingSize) {
  if (value == null || !servingSize || !servingSize.value) {
    return null;
  }

  return (value * 100) / servingSize.value;
}
const delay = (ms = 900) => new Promise((r) => setTimeout(r, ms));

const SAMPLES = [
  {
    productName: 'Sunrise Mango Fruit Drink',
    servingSize: { value: 200, unit: 'ml' },
    ingredients: 'Water, Mango Pulp (12%), Invert Syrup, Maltodextrin, High Fructose Corn Syrup, Acidity Regulator (330), Added Flavour (Natural and Nature-Identical Flavouring Substances)',
    claims: ['Zero Sugar', 'Real Fruit'],
    nutrition: { calories: 84, carbohydrate: 21, sugar: 18, totalFat: 0, saturatedFat: null, protein: 0, sodium: 25 },
  },
  {
    productName: 'Protein Crunch Peanut Bar',
    servingSize: { value: 40, unit: 'g' },
    ingredients: 'Peanuts (28%), Soy Protein Isolate, Glucose Syrup, Jaggery, Wheat Flour, Palm Oil, Milk Solids, Salt',
    claims: ['High Protein', 'No Added Sugar'],
    nutrition: { calories: 176, carbohydrate: 17, sugar: 7, totalFat: 8, saturatedFat: 3, protein: 7, sodium: 140 },
  },
];

export async function scanBarcode(barcode) {
  await delay();
  if (barcode === '9999999999999') {
    throw new ApiError('Could not reach the server. Check your internet connection and try again.', { code: 'NETWORK', retryable: true });
  }
  if (barcode === '0000000000000') return { found: false };
  const sample = SAMPLES[Number(barcode.slice(-1)) % SAMPLES.length];
  return { found: true, parsedData: sample, confidence: {} };
}

/** Pretends OCR on a glary label: sugar + serving size come back low-confidence and sodium is missing. */
export async function scanOcr(imageUri) {
  await delay(1400);
  const parsed = JSON.parse(JSON.stringify(SAMPLES[1]));
  parsed.nutrition.sodium = null;
  return { found: true, parsedData: parsed, confidence: { sugar: 0.45, servingSize: 0.6, sodium: 0 }, imageUri };
}

// ---- Illustrative rules only. The backend owns the real FSSAI / WHO benchmarks. ----
const SUGAR_ALIASES = [
  ['high fructose corn syrup', 'A sweetener made by converting corn starch into fructose and glucose.', 'Cheap and very sweet. It counts as added sugar even though it is not called "sugar".'],
  ['fruit juice concentrate', 'Fruit juice with the water removed.', 'Behaves like added sugar in your body, with little of the fibre in whole fruit.'],
  ['invert syrup', 'Table sugar split into glucose and fructose.', 'Sweeter than sugar and common in drinks. It is added sugar by another name.'],
  ['glucose syrup', 'A thick sweetener made from starch.', 'Adds sweetness and calories with no nutrients.'],
  ['liquid glucose', 'Another name for glucose syrup.', 'Adds sweetness and calories with no nutrients.'],
  ['maltodextrin', 'A powder made from corn, rice or wheat starch.', 'Raises blood sugar faster than table sugar, but is often left out of the "sugar" line.'],
  ['dextrose', 'Glucose made from corn or wheat.', 'Absorbed very quickly. It is added sugar.'],
  ['corn syrup', 'A syrup made from corn starch.', 'Adds sweetness and calories with no nutrients.'],
  ['malt extract', 'A sweet extract from sprouted barley.', 'Counts toward added sugar. Contains gluten.'],
  ['jaggery', 'Unrefined cane sugar.', 'Often seen as healthier, but your body treats it as added sugar.'],
  ['fructose', 'The sugar found in fruit, sold as a powder.', 'In large amounts it is added sugar.'],
];

function findAliases(ingredients) {
  const text = (ingredients || '').toLowerCase();
  const hits = SUGAR_ALIASES.filter(([term]) => text.includes(term));
  // Drop shorter terms already covered by a longer match (e.g. "corn syrup" inside "high fructose corn syrup").
  return hits
    .filter(([term]) => !hits.some(([other]) => other !== term && other.includes(term)))
    .map(([term, definition, explanation]) => ({ term, definition, explanation }));
}

// Indicative per-100 g/ml thresholds [moderate above, high above] for traffic-light flags.
const THRESHOLDS = { sugar: [5, 22.5], sodium: [120, 600], totalFat: [3, 17.5], saturatedFat: [1.5, 5] };

function flagFor(key, per100) {
  const t = THRESHOLDS[key];
  if (!t || per100 === null) return null;
  if (per100 > t[1]) return 'high';
  if (per100 > t[0]) return 'moderate';
  return 'low';
}

function verifyClaim(claim, ctx) {
  const c = claim.toLowerCase();
  const { per100, aliases, ingredients } = ctx;
  const sugarWord = /\b(sugar|jaggery)\b/.test((ingredients || '').toLowerCase());
  const aliasNames = aliases.map((a) => a.term).join(', ');
  if (/zero sugar|sugar free|no sugar/.test(c)) {
    if (per100.sugar !== null && per100.sugar > 0.5) return { status: 'misleading', evidence: `The nutrition table lists ${per100.sugar} g sugar per 100 g/ml.` };
    if (aliases.length || sugarWord) return { status: 'misleading', evidence: `The ingredient list contains sweeteners that act as sugar: ${aliasNames || 'sugar'}.` };
    if (per100.sugar === null) return { status: 'unverified', evidence: 'Sugar is not reported on the label, so this claim cannot be checked.' };
    return { status: 'verified', evidence: 'Sugar is 0.5 g or less per 100 g/ml and no sugar aliases are in the ingredients.' };
  }
  if (/no added sugar/.test(c)) {
    if (!ingredients) return { status: 'unverified', evidence: 'No ingredient list was captured, so this claim cannot be checked.' };
    if (aliases.length || sugarWord) return { status: 'misleading', evidence: `Added sweeteners appear in the ingredients: ${aliasNames || 'sugar'}.` };
    return { status: 'verified', evidence: 'No added sugar or sugar aliases were found in the ingredients.' };
  }
  if (/high protein/.test(c)) {
    if (per100.protein === null) return { status: 'unverified', evidence: 'Protein is not reported on the label.' };
    return per100.protein >= 12
      ? { status: 'verified', evidence: `Protein is ${per100.protein} g per 100 g/ml, which meets the 12 g threshold used here.` }
      : { status: 'misleading', evidence: `Protein is only ${per100.protein} g per 100 g/ml, below the 12 g threshold used here.` };
  }
  if (/low sodium/.test(c)) {
    if (per100.sodium === null) return { status: 'unverified', evidence: 'Sodium is not reported on the label.' };
    return per100.sodium <= 120
      ? { status: 'verified', evidence: `Sodium is ${per100.sodium} mg per 100 g/ml (120 mg or less).` }
      : { status: 'misleading', evidence: `Sodium is ${per100.sodium} mg per 100 g/ml, above the 120 mg limit.` };
  }
  return { status: 'unverified', evidence: 'There is no rule yet to check this claim against the label.' };
}

function preferenceFlags(prefs, ctx) {
  const flags = [];
  const text = (ctx.ingredients || '').toLowerCase();
  if (prefs.includes('avoidAddedSugar') && ctx.aliases.length) flags.push({ severity: 'danger', message: `Contains added sugar: ${ctx.aliases.map((a) => a.term).join(', ')}.` });
  if (prefs.includes('lowSodium') && ctx.per100.sodium !== null && ctx.per100.sodium > 120) flags.push({ severity: 'warn', message: `Sodium is ${ctx.per100.sodium} mg per 100 g/ml, above the low-sodium level.` });
  if (prefs.includes('lowSaturatedFat') && ctx.per100.saturatedFat !== null && ctx.per100.saturatedFat > 1.5) flags.push({ severity: 'warn', message: `Saturated fat is ${ctx.per100.saturatedFat} g per 100 g/ml.` });
  if ((prefs.includes('vegan') || prefs.includes('vegetarian')) && /(milk|whey|ghee|butter|curd|casein|egg|gelatin)/.test(text) && prefs.includes('vegan')) flags.push({ severity: 'danger', message: 'Contains an animal-derived ingredient (milk or egg products).' });
  if (prefs.includes('glutenFree') && /(wheat|maida|barley|malt|atta|semolina|rava)/.test(text)) flags.push({ severity: 'danger', message: 'Contains a gluten source (wheat, maida, barley or malt).' });
  return flags;
}

export async function analyze(parsedData, userPreferences = []) {
  await delay(1100);
  const { productName, servingSize, ingredients, claims = [], nutrition = {} } = parsedData;
  const per100 = {};
  const comparison = NUTRIENTS.map(({ key, label, unit }) => {
    const perServing = nutrition[key] === undefined ? null : nutrition[key];
    per100[key] = normalizeToPer100(perServing, servingSize);
    return {
      key, label, unit, perServing, per100: per100[key],
      status: perServing === null ? 'missing' : perServing === 0 ? 'zero' : 'ok',
      flag: flagFor(key, per100[key]),
    };
  });
  const canNormalize = !!servingSize && servingSize.value > 0 && ['g', 'ml'].includes(servingSize.unit);
  const aliases = findAliases(ingredients);
  const ctx = { per100, aliases, ingredients };
  const missingFields = [
    ...(ingredients ? [] : ['Ingredient list']),
    ...(servingSize ? [] : ['Serving size']),
    ...comparison.filter((r) => r.status === 'missing').map((r) => r.label),
  ];
  const verified = claims.map((claim) => ({ claim, ...verifyClaim(claim, ctx) }));
  const highlights = [
    ...(aliases.length ? [{ level: 'danger', label: `${aliases.length} hidden sugar${aliases.length > 1 ? 's' : ''}` }] : []),
    ...(verified.some((v) => v.status === 'misleading') ? [{ level: 'warn', label: 'Misleading claim' }] : []),
    ...comparison.filter((r) => r.flag === 'high').map((r) => ({ level: 'danger', label: `High ${r.label.toLowerCase()}` })),
  ];
  return {
    productName, servingSize, comparison, missingFields, highlights,
    normalizationWarning: canNormalize ? null : 'Per 100 g/ml values cannot be calculated because the serving size is missing or not in g or ml. Per-serving values are shown instead.',
    sugarAliases: aliases,
    claims: verified,
    preferenceFlags: preferenceFlags(userPreferences, ctx),
  };
}
