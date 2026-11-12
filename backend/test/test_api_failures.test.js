'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { OffClient } = require('../src/data-engine/adapters/off_client');
const { OffNotFoundError, OffUpstreamError, OffInvalidResponseError, OffNetworkError, ValidationError } = require('../src/data-engine/errors');
function response({ status = 200, body = {}, ok = status >= 200 && status < 300, jsonError = false } = {}) {
  return { status, ok, headers: { get: () => null }, async json() { if (jsonError) throw new Error('bad json'); return body; } };
}
function client(fetchImpl) { return new OffClient({ userAgent: 'FoodScanner-Test/0.1 (test@example.invalid)', fetchImpl, fields: ['code','product_name'] }); }

test('barcode lookup uses v3 endpoint, fields and an identifying User-Agent', async () => {
  let called;
  const api = client(async (url, init) => { called = { url: String(url), init }; return response({ body: { status: 'success', product: { code: '8901234567890', product_name: 'Test' } } }); });
  const parsed = await api.lookupByBarcode('8901234567890');
  assert.equal(parsed.outcome, 'found');
  assert.match(called.url, /\/api\/v3\/product\/8901234567890/);
  assert.match(called.url, /fields=code%2Cproduct_name/);
  assert.equal(called.init.headers['User-Agent'], 'FoodScanner-Test/0.1 (test@example.invalid)');
});
test('invalid barcode is rejected before network access', async () => {
  const api = client(async () => { throw new Error('should not be called'); });
  await assert.rejects(api.lookupByBarcode('1234'), ValidationError);
});
test('HTTP 404 becomes a typed not-found result', async () => {
  await assert.rejects(client(async () => response({ status: 404, ok: false })).lookupByBarcode('8901234567890'), OffNotFoundError);
});
test('HTTP 429/5xx errors carry retryability metadata', async () => {
  await assert.rejects(client(async () => response({ status: 503, ok: false })).lookupByBarcode('8901234567890'), (e) => e instanceof OffUpstreamError && e.retryable);
  await assert.rejects(client(async () => response({ status: 429, ok: false })).lookupByBarcode('8901234567890'), (e) => e instanceof OffUpstreamError && e.retryable);
});
test('malformed JSON and malformed product response are typed errors', async () => {
  await assert.rejects(client(async () => response({ jsonError: true })).lookupByBarcode('8901234567890'), OffInvalidResponseError);
  await assert.rejects(client(async () => response({ body: { status: 'success' } })).lookupByBarcode('8901234567890'), OffInvalidResponseError);
});
test('network failure is typed and retryable', async () => {
  await assert.rejects(client(async () => { throw new Error('socket failed'); }).lookupByBarcode('8901234567890'), (e) => e instanceof OffNetworkError && e.retryable);
});
