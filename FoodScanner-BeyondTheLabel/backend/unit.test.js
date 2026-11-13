'use strict';
process.env.OFFLINE = '1'; // never hit the network in tests
const test = require('node:test');
const assert = require('node:assert');
const { handlers } = require('./routes/api');
const ScanLog = require('./models/ScanLog');

const call = async (h, req = {}) => {
  const res = { statusCode: 200, status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; return this; } };
  await h({ body: {}, query: {}, ...req }, res);
  return res;
};

test('health reports ok and in-memory db without MONGO_URI', async () => {
  await ScanLog.connect(undefined);
  const r = await call(handlers.health);
  assert.strictEqual(r.body.success, true);
  assert.strictEqual(r.body.data.db, 'memory');
});
test('scanBarcode: valid, invalid and unknown', async () => {
  const ok = await call(handlers.scanBarcode, { body: { barcode: '8901058851298' } });
  assert.strictEqual(ok.statusCode, 200);
  assert.match(ok.body.data.product.name, /Maggi/);
  const bad = await call(handlers.scanBarcode, { body: { barcode: '1234' } });
  assert.strictEqual(bad.statusCode, 400);
  assert.strictEqual(bad.body.error.code, 'INVALID_BARCODE');
  const unk = await call(handlers.scanBarcode, { body: { barcode: '4006381333931' } });
  assert.strictEqual(unk.statusCode, 404);
  assert.strictEqual(unk.body.success, false);
});
test('scanOcr validates input and returns ocr + product', async () => {
  assert.strictEqual((await call(handlers.scanOcr, { body: {} })).statusCode, 400);
  const r = await call(handlers.scanOcr, { body: { text: 'Energy 200 kcal\nSugar 20 g\nSodium 300 mg\nFat 5 g\nProtein 2 g' } });
  assert.strictEqual(r.body.data.product.nutrition.sugar, 20);
  assert.ok('confidence' in r.body.data.ocr);
});
test('analyze works for barcode, text and client-edited product, and logs history', async () => {
  await ScanLog.clear();
  const a = await call(handlers.analyze, { body: { barcode: '5449000000996', preferences: { conditions: ['diabetes'] } } });
  assert.strictEqual(a.body.data.method, 'barcode');
  assert.ok(a.body.data.analysis.flags.some((f) => f.id === 'personal:diabetes'));
  const b = await call(handlers.analyze, { body: { text: 'Sugar 30 g\nSodium 100 mg\nFat 2 g' } });
  assert.strictEqual(b.body.data.method, 'ocr');
  const c = await call(handlers.analyze, { body: { product: { name: 'Edited', nutrition: { sugar: '3', sodium: 50 } } } });
  assert.strictEqual(c.body.data.product.nutrition.sugar, 3);
  assert.strictEqual((await call(handlers.analyze, { body: {} })).statusCode, 400);
  const h = await call(handlers.history);
  assert.strictEqual(h.body.data.items.length, 3);
  await call(handlers.clearHistory);
  assert.strictEqual((await call(handlers.history)).body.data.items.length, 0);
});
