'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { validateBarcode, cleanOcrText, scoreOcrConfidence } = require('./index');

test('validateBarcode accepts valid EAN-13 (Maggi) and strips noise', () => {
  const r = validateBarcode(' 8901058851298 ');
  assert.strictEqual(r.valid, true);
  assert.strictEqual(r.normalized, '8901058851298');
  assert.strictEqual(r.format, 'EAN-13');
});
test('validateBarcode rejects bad check digit and bad length', () => {
  assert.strictEqual(validateBarcode('8901058851299').valid, false);
  assert.strictEqual(validateBarcode('12345').valid, false);
  assert.strictEqual(validateBarcode(null).valid, false);
});
test('cleanOcrText fixes common OCR slips', () => {
  const t = cleanOcrText('Sugar  1O g\nSodium 4,5 gm\nEnergy 120 Kcal');
  assert.match(t, /Sugar 10 g/);
  assert.match(t, /4\.5 g/);
  assert.match(t, /120 kcal/);
});
test('scoreOcrConfidence: good label is high, garbage is low', () => {
  const good = 'Nutrition Facts per 100 g\nEnergy 450 kcal\nProtein 8 g\nCarbohydrate 60 g\nSugar 5 g\nFat 15 g\nSaturated fat 6 g\nSodium 800 mg';
  const g = scoreOcrConfidence(good);
  assert.strictEqual(g.level, 'high');
  assert.deepStrictEqual(g.missing, []);
  const bad = scoreOcrConfidence('@@## ~~ ^^ ??');
  assert.strictEqual(bad.level, 'low');
  assert.strictEqual(bad.needsReview, true);
  assert.strictEqual(scoreOcrConfidence('').confidence, 0);
});
