'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { verify } = require('./index');

const base = (o = {}) => ({ per: '100g', ingredients: [], ingredientsText: '', additives: [], allergens: [], claims: [], nova: null, nutrition: {}, ...o });
const clean = base({ ingredientsText: 'Oats, Almonds', ingredients: ['Oats', 'Almonds'], nutrition: { energyKcal: 380, sugar: 1, sodium: 20, fat: 7, saturatedFat: 1, protein: 13, fiber: 10 } });
const junk = base({ ingredientsText: 'Sugar, Glucose syrup, Palm oil', ingredients: ['Sugar', 'Glucose syrup', 'Palm oil'], additives: ['INS 102', 'INS 211'], nutrition: { energyKcal: 520, sugar: 45, sodium: 700, fat: 28, saturatedFat: 14, protein: 3, fiber: 1 }, claims: ['healthy', 'no added sugar'] });

test('output contract has all required keys', () => {
  const r = verify(clean, {});
  for (const k of ['score', 'grade', 'flags', 'warnings', 'positives', 'claimCheck', 'nutriScore', 'nova', 'personalVerdict']) assert.ok(k in r, k);
  assert.ok(r.score >= 0 && r.score <= 100);
});
test('healthy food scores well, junk food scores badly', () => {
  const a = verify(clean, {}); const b = verify(junk, {});
  assert.ok(a.score >= 80 && a.grade === 'A', `clean=${a.score}`);
  assert.ok(b.score < 35 && ['D', 'E'].includes(b.grade), `junk=${b.score}`);
  assert.ok(b.score < a.score);
});
test('hidden sugar and risky additives are flagged', () => {
  const r = verify(junk, {});
  assert.ok(r.flags.some((f) => f.id === 'hidden-sugar'));
  assert.ok(r.flags.some((f) => f.id === 'additive:INS 102'));
  assert.ok(r.warnings.some((w) => /Additives/.test(w)));
});
test('claim check catches contradictions', () => {
  const r = verify(junk, {});
  assert.strictEqual(r.claimCheck.find((c) => c.claim === 'healthy').verdict, 'contradicted');
  assert.strictEqual(r.claimCheck.find((c) => c.claim === 'no added sugar').verdict, 'contradicted');
  const msg = verify(base({ additives: ['INS 627', 'INS 631'], claims: ['no added msg'], nutrition: { sugar: 1 } }), {});
  assert.strictEqual(msg.claimCheck[0].verdict, 'questionable');
});
test('allergen, diet and condition conflicts are personalised', () => {
  const p = base({ ingredientsText: 'Wheat flour, Milk solids, Gelatin', ingredients: ['Wheat flour', 'Milk solids', 'Gelatin'], nutrition: { sugar: 30, sodium: 700 } });
  const r = verify(p, { allergens: ['milk'], diets: ['vegetarian'], conditions: ['diabetes', 'hypertension'] });
  assert.strictEqual(r.personalVerdict, 'avoid');
  ['personal:allergen:milk', 'personal:diet:vegetarian', 'personal:diabetes', 'personal:hypertension'].forEach((id) => assert.ok(r.flags.some((f) => f.id === id), id));
  assert.strictEqual(verify(p, {}).personalVerdict, 'ok');
});
test('beverages use stricter thresholds and Nutri-Score drinks scale', () => {
  const cola = base({ per: '100ml', nutrition: { energyKcal: 42, sugar: 10.6, sodium: 10, fat: 0, saturatedFat: 0 } });
  const r = verify(cola, {});
  assert.strictEqual(r.flags.find((f) => f.id === 'sugar').level, 'amber');
  assert.strictEqual(r.nutriScore.grade, 'E');
});
test('missing data never crashes', () => {
  const r = verify({}, undefined);
  assert.ok(Number.isInteger(r.score));
  assert.ok(r.warnings.some((w) => /little nutrition data/.test(w)));
  assert.doesNotThrow(() => verify(null, null));
});
