'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createUsdaClient, UsdaApiError } = require('../../src/data-engine/reference/usda_client');

function mockResponse(payload, { status = 200, headers = {} } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (key) => headers[key] || null },
    json: async () => payload,
  };
}

test('USDA search posts query and data type filters and returns candidates only', async () => {
  let captured;
  const client = createUsdaClient({
    apiKey: 'test-key',
    fetchImpl: async (url, options) => {
      captured = { url: new URL(url), options };
      return mockResponse({ foods: [{ fdcId: 12345, description: 'Oats, raw', dataType: 'Foundation' }] }, { headers: { 'X-RateLimit-Limit': '1000', 'X-RateLimit-Remaining': '998' } });
    },
  });
  const result = await client.searchFoods('oats');
  assert.equal(result.status, 'candidates_found');
  assert.equal(result.candidates[0].fdcId, 12345);
  assert.deepEqual(result.rateLimit, { limit: '1000', remaining: '998' });
  assert.equal(captured.url.pathname, '/fdc/v1/foods/search');
  assert.equal(captured.url.searchParams.get('api_key'), 'test-key');
  assert.equal(captured.options.method, 'POST');
  const body = JSON.parse(captured.options.body);
  assert.equal(body.query, 'oats');
  assert.deepEqual(body.dataType, ['Foundation', 'SR Legacy']);
});

test('USDA detail lookup normalizes nutrient values and preserves data type/basis', async () => {
  const client = createUsdaClient({
    apiKey: 'test-key',
    fetchImpl: async () => mockResponse({
      fdcId: 12345,
      description: 'Oats, raw',
      dataType: 'Foundation',
      foodNutrients: [{ nutrient: { id: 1003, number: '203', name: 'Protein', unitName: 'G' }, amount: 16.9 }],
    }),
  });
  const food = await client.getFoodDetails(12345, { allowedDataTypes: ['Foundation', 'SR Legacy'] });
  assert.equal(food.provider, 'USDA_FDC');
  assert.equal(food.externalFoodId, '12345');
  assert.equal(food.basis, 'per_100g_edible_portion');
  assert.equal(food.nutrients[0].name, 'Protein');
  assert.equal(food.nutrients[0].amount, 16.9);
});

test('USDA client refuses a missing API key before network access', async () => {
  const client = createUsdaClient({ apiKey: '', fetchImpl: async () => { throw new Error('must not call'); } });
  await assert.rejects(() => client.searchFoods('oats'), (error) => error.code === 'USDA_API_KEY_MISSING');
});

test('USDA client reports rate limiting and retry guidance without exposing API key', async () => {
  const client = createUsdaClient({
    apiKey: 'secret-test-key',
    fetchImpl: async () => mockResponse({ message: 'slow down' }, { status: 429, headers: { 'Retry-After': '60' } }),
  });
  await assert.rejects(() => client.searchFoods('oats'), (error) => {
    assert.ok(error instanceof UsdaApiError);
    assert.equal(error.code, 'USDA_RATE_LIMITED');
    assert.equal(error.retryable, true);
    assert.equal(error.retryAfter, '60');
    assert.equal(error.message.includes('secret-test-key'), false);
    return true;
  });
});

test('USDA client validates search and FDC identifiers before network access', async () => {
  const client = createUsdaClient({ apiKey: 'test-key', fetchImpl: async () => mockResponse({}) });
  await assert.rejects(() => client.searchFoods('   '), TypeError);
  await assert.rejects(() => client.getFoodDetails('abc'), TypeError);
});

test('USDA client rejects a source data type outside the requested allow-list', async () => {
  const client = createUsdaClient({
    apiKey: 'test-key',
    fetchImpl: async () => mockResponse({ fdcId: 123, description: 'Brand snack', dataType: 'Branded', foodNutrients: [] }),
  });
  await assert.rejects(() => client.getFoodDetails(123, { allowedDataTypes: ['Foundation', 'SR Legacy'] }),
    (error) => error.code === 'USDA_DATA_TYPE_NOT_ALLOWED');
});

test('USDA client maps upstream server errors as retryable', async () => {
  const client = createUsdaClient({ apiKey: 'test-key', fetchImpl: async () => mockResponse({}, { status: 503 }) });
  await assert.rejects(() => client.searchFoods('oats'), (error) => error.code === 'USDA_UPSTREAM_ERROR' && error.retryable === true);
});


test('USDA client treats Foundation and SR Legacy as distinct source-basis labels', async () => {
  const client = createUsdaClient({
    apiKey: 'test-key',
    fetchImpl: async () => mockResponse({ fdcId: 234, description: 'Rice, white', dataType: 'SR Legacy', foodNutrients: [] }),
  });
  const food = await client.getFoodDetails(234);
  assert.equal(food.basis, 'per_100g_source_food');
});

test('USDA client returns not found and retryable network errors with typed codes', async () => {
  const notFound = createUsdaClient({ apiKey: 'test-key', fetchImpl: async () => mockResponse({}, { status: 404 }) });
  await assert.rejects(() => notFound.getFoodDetails(998877), (error) => error.code === 'USDA_RECORD_NOT_FOUND');

  const networkFailure = createUsdaClient({ apiKey: 'test-key', fetchImpl: async () => { throw new Error('offline'); } });
  await assert.rejects(() => networkFailure.searchFoods('oats'), (error) => error.code === 'USDA_NETWORK_ERROR' && error.retryable === true);
});


test('USDA client records retrieval time for source provenance', async () => {
  const client = createUsdaClient({
    apiKey: 'test-key',
    now: () => '2026-11-13T00:00:00.000Z',
    fetchImpl: async () => mockResponse({ fdcId: 12345, description: 'Oats, raw', dataType: 'Foundation', foodNutrients: [] }),
  });
  const food = await client.getFoodDetails(12345);
  assert.equal(food.retrievedAt, '2026-11-13T00:00:00.000Z');
});

test('USDA client aborts requests at the configured timeout', async () => {
  const client = createUsdaClient({
    apiKey: 'test-key',
    timeoutMs: 5,
    fetchImpl: (_url, options) => new Promise((resolve, reject) => {
      options.signal.addEventListener('abort', () => {
        const error = new Error('aborted');
        error.name = 'AbortError';
        reject(error);
      }, { once: true });
    }),
  });
  await assert.rejects(() => client.searchFoods('oats'), (error) => error.code === 'USDA_TIMEOUT' && error.retryable === true);
});
