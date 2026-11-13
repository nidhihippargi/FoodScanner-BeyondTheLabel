'use strict';
process.env.OFFLINE = '1';
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const vision = require('../vision');
const dataEng = require('../data-engineering');
const verification = require('../verification');
const { handlers } = require('../backend/routes/api');
const ScanLog = require('../backend/models/ScanLog');

const NUTRIENTS = ['energyKcal', 'sugar', 'addedSugar', 'sodium', 'salt', 'fat', 'saturatedFat', 'transFat', 'carbs', 'protein', 'fiber'];
const assertProduct = (p) => {
  ['barcode', 'name', 'brand', 'source', 'per', 'ingredientsText', 'ingredients', 'nutrition', 'additives', 'allergens', 'claims', 'nutriscore', 'nova'].forEach((k) => assert.ok(k in p, `product.${k}`));
  NUTRIENTS.forEach((k) => assert.ok(k in p.nutrition, `nutrition.${k}`));
};
const assertAnalysis = (a) => {
  assert.ok(Number.isInteger(a.score) && a.score >= 0 && a.score <= 100);
  assert.ok(['A', 'B', 'C', 'D', 'E'].includes(a.grade));
  ['flags', 'warnings', 'positives', 'claimCheck'].forEach((k) => assert.ok(Array.isArray(a[k]), k));
  a.flags.forEach((f) => { assert.ok(f.id && f.title && f.detail && f.why); assert.ok(['red', 'amber', 'green', 'unknown'].includes(f.level)); });
  assert.ok(['ok', 'caution', 'avoid'].includes(a.personalVerdict));
};
const call = async (h, req = {}) => {
  const res = { statusCode: 200, status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; return this; } };
  await h({ body: {}, query: {}, ...req }, res);
  return res;
};

test('pipeline: Vision -> Data-Eng -> Verification for every demo barcode', async () => {
  for (const code of Object.keys(dataEng.MOCK_PRODUCTS)) {
    assert.ok(vision.validateBarcode(code).valid, `${code} must be a valid barcode`);
    const found = await dataEng.getProductByBarcode(code, { offline: true });
    assertProduct(found.product);
    assertAnalysis(verification.verify(found.product, {}));
  }
});

test('pipeline: OCR text -> confidence -> parse -> verify', () => {
  const text = 'Nutrition per 100 g\nEnergy 520 kcal\nProtein 6 g\nCarbohydrate 55 g\nSugar 30 g\nFat 30 g\nSaturated fat 15 g\nSodium 700 mg\nIngredients: Sugar, Palm oil, Colour (102).\nHealthy';
  const conf = vision.scoreOcrConfidence(text);
  assert.strictEqual(conf.level, 'high');
  const p = dataEng.parseOcrText(conf.cleanedText);
  assertProduct(p);
  const a = verification.verify(p, {});
  assertAnalysis(a);
  assert.ok(a.score < 50);
  assert.strictEqual(a.claimCheck.find((c) => c.claim === 'healthy').verdict, 'contradicted');
});

test('API contract: barcode -> analyze -> history round trip', async () => {
  await ScanLog.connect(undefined);
  await ScanLog.clear();
  const scan = await call(handlers.scanBarcode, { body: { barcode: '8901058851298' } });
  assert.strictEqual(scan.body.success, true);
  assertProduct(scan.body.data.product);
  const an = await call(handlers.analyze, { body: { product: scan.body.data.product, preferences: { allergens: ['gluten'], conditions: ['hypertension'] } } });
  assert.strictEqual(an.statusCode, 200);
  assertProduct(an.body.data.product);
  assertAnalysis(an.body.data.analysis);
  assert.strictEqual(an.body.data.analysis.personalVerdict, 'avoid');
  assert.ok(an.body.data.analysis.claimCheck.some((c) => c.verdict === 'questionable'));
  const hist = await call(handlers.history);
  assert.strictEqual(hist.body.data.items[0].scanId, an.body.data.scanId);
});

test('API contract: OCR route output feeds /analyze unchanged', async () => {
  const o = await call(handlers.scanOcr, { body: { text: 'Energy 100 kcal\nSugar 3 g\nSodium 90 mg\nFat 1 g\nProtein 5 g' } });
  const an = await call(handlers.analyze, { body: { product: o.body.data.product } });
  assertAnalysis(an.body.data.analysis);
});

test('API contract: error envelope', async () => {
  const r = await call(handlers.scanBarcode, { body: { barcode: 'abc' } });
  assert.deepStrictEqual(Object.keys(r.body).sort(), ['error', 'success']);
  assert.ok(r.body.error.code && r.body.error.message);
});

test('live HTTP server smoke test (runs only when backend deps are installed)', async (t) => {
  let express;
  try { express = require.resolve('express', { paths: [path.join(__dirname, '../backend')] }); require.resolve('cors', { paths: [path.join(__dirname, '../backend')] }); } catch (e) { return t.skip('run `npm run install:all` to enable'); }
  const { createApp } = require('../backend/server');
  const server = createApp().listen(0, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  try {
    const base = `http://127.0.0.1:${server.address().port}/api`;
    const post = (p, b) => fetch(base + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...b, offline: true }) }).then((r) => r.json());
    assert.strictEqual((await fetch(`${base}/health`).then((r) => r.json())).data.status, 'ok');
    const s = await post('/scan/barcode', { barcode: '5449000000996' });
    assertProduct(s.data.product);
    assertAnalysis((await post('/analyze', { product: s.data.product })).data.analysis);
  } finally { server.close(); }
});
