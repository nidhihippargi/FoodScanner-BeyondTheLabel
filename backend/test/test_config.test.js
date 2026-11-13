 'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadConfig } = require('../src/data-engine/config');
const { ConfigurationError } = require('../src/data-engine/errors');

test('OFF configuration requires an identifiable User-Agent', () => {
  assert.throws(() => loadConfig({}), ConfigurationError);
});
test('staging basic-auth credentials must be supplied as a pair', () => {
  assert.throws(() => loadConfig({ OFF_USER_AGENT: 'FoodScanner-Test/1.0 (test@example.invalid)', OFF_BASIC_AUTH_USER: 'off' }), ConfigurationError);
});
test('valid config uses v3 route and accepts staging credentials', () => {
  const config = loadConfig({ OFF_USER_AGENT: 'FoodScanner-Test/1.0 (test@example.invalid)', OFF_BASE_URL: 'https://world.openfoodfacts.net', OFF_BASIC_AUTH_USER: 'off', OFF_BASIC_AUTH_PASSWORD: 'off' });
  assert.equal(config.offApiVersion, 'v3');
  assert.equal(config.offBasicAuthUser, 'off');
  assert.ok(config.offFields.includes('nutrition'));
});
