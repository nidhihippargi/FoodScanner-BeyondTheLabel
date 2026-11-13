'use strict';
const R = require('./rules');

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const has = (text, word) => new RegExp(`\\b${esc(word)}\\b`, 'i').test(text);
const nz = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const pts = (v, th) => th.filter((t) => v > t).length;

function traffic(v, t) { return v === null ? 'unknown' : v <= t.low ? 'green' : v > t.high ? 'red' : 'amber'; }
function additiveInfo(code) {
  const m = /(\d{3,4}[a-z]?)/i.exec(String(code));
  if (!m) return null;
  const key = m[1].toLowerCase();
  return { code: `INS ${key}`, ...(R.ADDITIVES[key] || R.ADDITIVES[key.replace(/[a-z]$/, '')] || null) };
}

function nutriScore(n, beverage) {
  const have = ['energyKcal', 'sugar', 'saturatedFat', 'sodium'].filter((k) => nz(n[k]) !== null);
  if (have.length === 0) return { grade: null, points: null, estimated: true };
  const kj = (nz(n.energyKcal) || 0) * 4.184;
  const E = beverage ? [0, 30, 60, 90, 120, 150, 180, 210, 240, 270] : [335, 670, 1005, 1340, 1675, 2010, 2345, 2680, 3015, 3350];
  const S = beverage ? [0, 1.5, 3, 4.5, 6, 7.5, 9, 10.5, 12, 13.5] : [4.5, 9, 13.5, 18, 22.5, 27, 31, 36, 40, 45];
  const SF = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const NA = [90, 180, 270, 360, 450, 540, 630, 720, 810, 900];
  const neg = pts(kj, E) + pts(nz(n.sugar) || 0, S) + pts(nz(n.saturatedFat) || 0, SF) + pts(nz(n.sodium) || 0, NA);
  const fib = pts(nz(n.fiber) || 0, [0.9, 1.9, 2.8, 3.7, 4.7]);
  const pro = pts(nz(n.protein) || 0, [1.6, 3.2, 4.8, 6.4, 8.0]);
  const points = beverage || neg < 11 ? neg - fib - pro : neg - fib;
  let grade;
  if (beverage) grade = neg === 0 ? 'A' : points <= 1 ? 'B' : points <= 5 ? 'C' : points <= 9 ? 'D' : 'E';
  else grade = points <= -1 ? 'A' : points <= 2 ? 'B' : points <= 10 ? 'C' : points <= 18 ? 'D' : 'E';
  return { grade, points, estimated: have.length < 4 };
}

function estimateNova(product, adds) {
  if (nz(product.nova) !== null) return product.nova;
  const text = (product.ingredientsText || '').toLowerCase();
  const marker = adds.some((a) => R.ULTRA_PROCESSED_CATEGORIES.includes(a.category)) ||
    /hydrogenated|maltodextrin|flavou?r|isolate|invert|modified starch|high fructose|glucose syrup/.test(text);
  if (marker) return 4;
  return (product.ingredients || []).length >= 3 ? 3 : 1;
}

function claimRules(product, ctx) {
  const n = product.nutrition || {};
  const v = (c, evidence) => ({ verdict: c, evidence });
  const need = (val, fn, ev) => (val === null ? v('unverifiable', 'Required nutrient value not found on label.') : fn(val) ? v('consistent', ev) : v('contradicted', ev));
  return [
    [/^(sugar free|zero sugar)$/, () => need(nz(n.sugar), (x) => x <= 0.5, `Sugar is ${n.sugar} g per 100 (sugar-free needs <=0.5 g).`)],
    [/^no added sugar$/, () => ctx.sugarAliases.length ? v('contradicted', `Ingredients list sugar sources: ${ctx.sugarAliases.join(', ')}.`) : nz(n.addedSugar) > 0 ? v('contradicted', `Added sugars ${n.addedSugar} g per 100.`) : v('consistent', 'No sugar ingredient names found.')],
    [/^low fat$/, () => need(nz(n.fat), (x) => x <= (ctx.beverage ? 1.5 : 3), `Fat is ${n.fat} g per 100.`)],
    [/^fat free$/, () => need(nz(n.fat), (x) => x <= 0.5, `Fat is ${n.fat} g per 100.`)],
    [/^low sodium$/, () => need(nz(n.sodium), (x) => x <= 120, `Sodium is ${n.sodium} mg per 100 (low <=120).`)],
    [/^low calorie$/, () => need(nz(n.energyKcal), (x) => x <= 40, `Energy is ${n.energyKcal} kcal per 100 (low <=40).`)],
    [/^high protein$/, () => need(nz(n.protein), (x) => x >= 12, `Protein is ${n.protein} g per 100.`)],
    [/^source of fib(re|er)$/, () => need(nz(n.fiber), (x) => x >= 3, `Fibre is ${n.fiber} g per 100 (source needs >=3).`)],
    [/^no preservatives$/, () => { const p = ctx.adds.filter((a) => a.category === 'preservative'); return p.length ? v('contradicted', `Preservative additive(s) present: ${p.map((a) => a.code).join(', ')}.`) : v('consistent', 'No preservative additives detected.'); }],
    [/^no (added )?msg$/, () => {
      if (ctx.adds.some((a) => /^INS (62[1-5])$/.test(a.code))) return v('contradicted', 'Glutamate additive present.');
      const fe = ctx.adds.filter((a) => ['INS 627', 'INS 631'].includes(a.code));
      return fe.length ? v('questionable', `Contains flavour enhancers ${fe.map((a) => a.code).join(' + ')}, which boost savoury taste alongside glutamate.`) : v('consistent', 'No glutamate additives detected.');
    }],
    [/^whole grain$/, () => /whole/i.test((product.ingredients || [])[0] || '') ? v('consistent', 'First ingredient is a whole grain.') : v('questionable', 'Whole grain is not the first ingredient.')],
    [/^100% natural$|^natural$/, () => { const a = ctx.adds.filter((x) => ['colour', 'flavour enhancer', 'preservative', 'sweetener'].includes(x.category)); return a.length ? v('contradicted', `Contains artificial-class additives: ${a.map((x) => x.code).join(', ')}.`) : v('questionable', '"Natural" has no strict legal definition.'); }],
    [/^(healthy|health drink|nutritious)$/, () => ctx.redCount > 0 || ctx.score < 50 ? v('contradicted', `Overall score ${ctx.score}/100 with ${ctx.redCount} red nutrient flag(s).`) : v('questionable', 'Vague marketing term with no legal definition.')],
  ];
}

function verify(productIn, prefs) {
  const product = productIn || {};
  const p = prefs || {};
  const n = product.nutrition || {};
  const beverage = product.per === '100ml';
  const th = beverage ? R.THRESHOLDS.beverage : R.THRESHOLDS.solid;
  const unit = beverage ? '100 ml' : '100 g';
  const text = (product.ingredientsText || (product.ingredients || []).join(', ') || '').toLowerCase();
  const flags = []; const warnings = []; const positives = [];
  let score = 100;

  // --- nutrient traffic lights ---
  const spec = [
    ['sugar', 'Sugar', 'g', 'sugar', R.DAILY_LIMITS.sugar, 'WHO recommends keeping free sugars under 10% of energy (about 50 g/day on 2000 kcal).', [20, 8]],
    ['saturatedFat', 'Saturated fat', 'g', 'saturatedFat', R.DAILY_LIMITS.saturatedFat, 'WHO recommends under 10% of energy from saturated fat (about 22 g/day).', [15, 6]],
    ['fat', 'Total fat', 'g', 'fat', R.DAILY_LIMITS.fat, 'WHO recommends total fat under 30% of energy.', [10, 4]],
    ['sodium', 'Sodium', 'mg', 'sodium', R.DAILY_LIMITS.sodium, 'WHO recommends under 2000 mg sodium (5 g salt) per day.', [20, 8]],
  ];
  let present = 0;
  for (const [key, label, u, tk, daily, why, [redPen, ambPen]] of spec) {
    const val = nz(n[key]);
    if (val !== null) present++;
    const level = traffic(val, th[tk]);
    const pct = val === null ? null : Math.round((val / daily) * 100);
    if (level === 'red') score -= redPen; else if (level === 'amber') score -= ambPen;
    flags.push({
      id: key, type: 'nutrient', level, nutrient: key, value: val, unit: u,
      title: level === 'unknown' ? `${label}: not found` : `${level === 'red' ? 'High' : level === 'amber' ? 'Medium' : 'Low'} ${label.toLowerCase()}`,
      detail: val === null ? `${label} was not detected on the label.` : `${val} ${u} per ${unit}${pct !== null ? ` (${pct}% of a typical daily limit)` : ''}.`,
      why, benchmark: `Low <= ${th[tk].low} ${u}, High > ${th[tk].high} ${u} per ${unit}`, source: 'FSSAI/WHO-aligned thresholds',
    });
    if (level === 'red') warnings.push(`${label} is high (${val} ${u} per ${unit}).`);
    if (level === 'green') positives.push(`Low ${label.toLowerCase()} (${val} ${u} per ${unit}).`);
  }
  const completeness = (present + (nz(n.energyKcal) !== null ? 1 : 0)) / 5;
  if (completeness < 0.4) warnings.push('Very little nutrition data was found, so this score is a rough estimate.');

  // --- trans fat ---
  if (nz(n.transFat) !== null && n.transFat > 0.2) {
    score -= 8; warnings.push(`Contains trans fat (${n.transFat} g per ${unit}).`);
    flags.push({ id: 'transFat', type: 'nutrient', level: 'red', nutrient: 'transFat', value: n.transFat, unit: 'g', title: 'Trans fat present', detail: `${n.transFat} g per ${unit}.`, why: 'Industrial trans fat raises LDL cholesterol; WHO aims to eliminate it from the food supply.', benchmark: 'Aim for as close to 0 g as possible', source: 'WHO' });
  }

  // --- hidden sugars ---
  const sugarAliases = R.HIDDEN_SUGAR_ALIASES.filter((a) => has(text, a));
  const topThree = (product.ingredients || []).slice(0, 3).join(' ').toLowerCase();
  const sugarTop = R.HIDDEN_SUGAR_ALIASES.some((a) => has(topThree, a));
  if (sugarAliases.length >= 2 || sugarTop) {
    score -= sugarTop ? 8 : 5;
    const d = `${sugarAliases.length} sugar source name(s): ${sugarAliases.join(', ')}.${sugarTop ? ' Sugar is among the top 3 ingredients.' : ''}`;
    flags.push({ id: 'hidden-sugar', type: 'ingredient', level: sugarTop ? 'red' : 'amber', title: 'Sugar appears under several names', detail: d, why: 'Splitting sugar across names (syrups, dextrose, maltodextrin) keeps each one lower on the ingredient list and hides the total.', benchmark: 'Ingredients are listed by weight, highest first', source: 'Ingredient analysis' });
    warnings.push(sugarTop ? 'Sugar is one of the first three ingredients.' : `Hidden sugar names found: ${sugarAliases.join(', ')}.`);
  }

  // --- additives ---
  const adds = [...new Set((product.additives || []))].map(additiveInfo).filter(Boolean);
  const known = adds.filter((a) => a.name);
  const caution = known.filter((a) => a.risk === 'caution'); const moderate = known.filter((a) => a.risk === 'moderate');
  score -= Math.min(12, caution.length * 4) + Math.min(6, moderate.length * 2);
  known.forEach((a) => {
    if (a.risk === 'low') return;
    flags.push({ id: `additive:${a.code}`, type: 'additive', level: a.risk === 'caution' ? 'red' : 'amber', title: `${a.name} (${a.code})`, detail: `${a.category}. ${a.note}`, why: a.note, benchmark: 'Permitted within regulatory limits', source: 'Additive dictionary' });
  });
  if (caution.length) warnings.push(`Additives to be aware of: ${caution.map((a) => `${a.name} (${a.code})`).join(', ')}.`);

  // --- processing level ---
  const nova = estimateNova(product, known);
  if (nova === 4) {
    score -= 8; warnings.push('Ultra-processed (NOVA 4).');
    flags.push({ id: 'nova', type: 'processing', level: 'amber', title: 'Ultra-processed (NOVA 4)', detail: 'Contains industrial ingredients or additives not used in home cooking.', why: 'Diets high in ultra-processed foods are associated with poorer health outcomes.', benchmark: 'NOVA group 1 (unprocessed) to 4 (ultra-processed)', source: 'NOVA' });
  }

  // --- positives ---
  if (nz(n.protein) !== null && n.protein >= 10) { score += 5; positives.push(`Good protein (${n.protein} g per ${unit}).`); } else if (nz(n.protein) !== null && n.protein >= 5) { score += 2; positives.push(`Some protein (${n.protein} g per ${unit}).`); }
  if (nz(n.fiber) !== null && n.fiber >= 6) { score += 5; positives.push(`High fibre (${n.fiber} g per ${unit}).`); } else if (nz(n.fiber) !== null && n.fiber >= 3) { score += 2; positives.push(`Contains fibre (${n.fiber} g per ${unit}).`); }
  if (flags.filter((f) => f.type === 'nutrient' && f.level === 'green').length === 4) score += 5;

  // --- claims ---
  const redCount = flags.filter((f) => f.type === 'nutrient' && f.level === 'red').length;
  const ctx = { sugarAliases, adds: known, beverage, redCount, score: Math.max(0, Math.min(100, score)) };
  const rules = claimRules(product, ctx);
  const claimCheck = (product.claims || []).map((claim) => {
    const c = claim.toLowerCase().trim();
    const r = rules.find(([re]) => re.test(c));
    return { claim, ...(r ? r[1]() : { verdict: 'unverifiable', evidence: 'No rule available to check this claim.' }) };
  });
  const bad = claimCheck.filter((c) => c.verdict === 'contradicted');
  score -= Math.min(10, bad.length * 5);
  bad.forEach((c) => warnings.push(`Claim "${c.claim}" is contradicted: ${c.evidence}`));
  claimCheck.filter((c) => c.verdict === 'questionable').forEach((c) => warnings.push(`Claim "${c.claim}" is questionable: ${c.evidence}`));

  // --- personal conflicts ---
  const personal = [];
  const declared = (product.allergens || []).join(' ').toLowerCase();
  for (const a of p.allergens || []) {
    const words = R.ALLERGEN_KEYWORDS[a] || [a];
    const hit = words.find((w) => has(text, w) || has(declared, w));
    if (hit) personal.push({ id: `personal:allergen:${a}`, level: 'red', title: `Contains ${a} (your allergen)`, detail: `Found "${hit}" in ingredients/allergen declaration.`, why: 'You listed this as an allergen. Always confirm with the physical label.' });
  }
  for (const d of p.diets || []) {
    const hit = (R.DIET_KEYWORDS[d] || []).find((w) => has(text, w));
    if (hit) personal.push({ id: `personal:diet:${d}`, level: 'red', title: `Not ${d}-friendly`, detail: `Found "${hit}" in ingredients.`, why: `Your profile follows a ${d} diet.` });
  }
  const lvl = (k) => flags.find((f) => f.id === k)?.level;
  for (const c of p.conditions || []) {
    if (c === 'diabetes' && ['red', 'amber'].includes(lvl('sugar'))) personal.push({ id: 'personal:diabetes', level: lvl('sugar'), title: 'Sugar matters for diabetes', detail: `Sugar is ${n.sugar} g per ${unit}.`, why: 'Added and free sugars raise blood glucose quickly; follow your clinician\'s advice.' });
    if (c === 'hypertension' && ['red', 'amber'].includes(lvl('sodium'))) personal.push({ id: 'personal:hypertension', level: lvl('sodium'), title: 'Sodium matters for blood pressure', detail: `Sodium is ${n.sodium} mg per ${unit}.`, why: 'High sodium intake raises blood pressure.' });
    if (c === 'pku' && adds.some((a) => a.code === 'INS 951')) personal.push({ id: 'personal:pku', level: 'red', title: 'Contains aspartame', detail: 'Aspartame contains phenylalanine.', why: 'People with PKU must avoid phenylalanine.' });
    if (c === 'children' && known.some((a) => a.category === 'colour' && a.risk === 'caution')) personal.push({ id: 'personal:children', level: 'amber', title: 'Contains azo colours', detail: 'Some azo dyes carry an EU warning on children\'s attention and activity.', why: 'Relevant when buying for children.' });
    if (c === 'gout' && known.some((a) => ['INS 627', 'INS 631'].includes(a.code))) personal.push({ id: 'personal:gout', level: 'amber', title: 'Contains purine-based flavour enhancers', detail: 'INS 627 / 631 are purine-derived.', why: 'People with gout may be advised to limit purines.' });
  }
  personal.forEach((x) => { flags.unshift({ ...x, type: 'personal', benchmark: 'Your dietary profile', source: 'Preferences' }); warnings.unshift(`${x.title}. ${x.detail}`); });
  const personalVerdict = personal.some((x) => x.level === 'red') ? 'avoid' : personal.length ? 'caution' : 'ok';

  score = Math.max(0, Math.min(100, Math.round(score)));
  const grade = score >= 80 ? 'A' : score >= 65 ? 'B' : score >= 50 ? 'C' : score >= 35 ? 'D' : 'E';
  return {
    score, grade, flags, warnings, positives, claimCheck,
    nutriScore: nutriScore(n, beverage), nova, personalVerdict, dataCompleteness: Math.round(completeness * 100) / 100,
    disclaimer: 'Informational only; not medical advice. Thresholds are configurable approximations of FSSAI/WHO guidance.',
  };
}

module.exports = { verify, nutriScore, additiveInfo };
