'use strict';

const { ConfigurationError } = require('./errors');
try { require('dotenv').config(); } catch (_) { /* dotenv is loaded by backend setup when installed */ }

function positiveInteger(value, fallback, name) {
  if (value === undefined || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new ConfigurationError(`${name} must be a positive integer.`);
  return parsed;
}

function loadConfig(env = process.env) {
  const userAgent = env.OFF_USER_AGENT?.trim();
  if (!userAgent) {
    throw new ConfigurationError('OFF_USER_AGENT is required. Set an identifiable AppName/Version (contact) User-Agent.');
  }
  const baseUrl = (env.OFF_BASE_URL || 'https://world.openfoodfacts.org').replace(/\/+$/, '');
  let parsed;
  try { parsed = new URL(baseUrl); } catch { throw new ConfigurationError('OFF_BASE_URL must be a valid URL.'); }
  if (!['https:', 'http:'].includes(parsed.protocol)) throw new ConfigurationError('OFF_BASE_URL must use HTTP or HTTPS.');
  const basicAuthUser = env.OFF_BASIC_AUTH_USER || '';
  const basicAuthPassword = env.OFF_BASIC_AUTH_PASSWORD || '';
  if (Boolean(basicAuthUser) !== Boolean(basicAuthPassword)) throw new ConfigurationError('OFF_BASIC_AUTH_USER and OFF_BASIC_AUTH_PASSWORD must be set together.');
  const apiVersion = env.OFF_API_VERSION || 'v3';
  if (!/^v\d+(?:\.\d+)?$/.test(apiVersion)) throw new ConfigurationError('OFF_API_VERSION must look like v3 or v3.6.');
  return Object.freeze({
    offBaseUrl: baseUrl,
    offApiVersion: apiVersion,
    offUserAgent: userAgent,
    offBasicAuthUser: basicAuthUser,
    offBasicAuthPassword: basicAuthPassword,
    offTimeoutMs: positiveInteger(env.OFF_TIMEOUT_MS, 8000, 'OFF_TIMEOUT_MS'),
    offFields: (env.OFF_FIELDS || 'code,product_name,brands,quantity,ingredients_text,ingredients_text_en,lang,lc,serving_size,nutrition_data_per,nutriments,nutrition,images,last_modified_t,schema_version,product_type')
      .split(',').map((item) => item.trim()).filter(Boolean),
    mongoUri: env.MONGODB_URI || '',
    mongoDbName: env.MONGODB_DB_NAME || 'food_scanner',
  });
}

module.exports = { loadConfig };
