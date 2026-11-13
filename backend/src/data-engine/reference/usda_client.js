'use strict';

const DEFAULT_BASE_URL = 'https://api.nal.usda.gov/fdc/v1';
const DEFAULT_DATA_TYPES = Object.freeze(['Foundation', 'SR Legacy']);
const ALLOWED_DATA_TYPES = new Set(['Foundation', 'SR Legacy', 'Survey (FNDDS)', 'Branded']);

class UsdaApiError extends Error {
  constructor(code, message, { statusCode = null, retryable = false, retryAfter = null, details = {} } = {}) {
    super(message);
    this.name = 'UsdaApiError';
    this.code = code;
    this.statusCode = statusCode;
    this.retryable = retryable;
    this.retryAfter = retryAfter;
    this.details = details;
  }
}

function normalizeNutrient(item) {
  const nutrient = item && item.nutrient && typeof item.nutrient === 'object' ? item.nutrient : item || {};
  const amount = typeof item.amount === 'number' ? item.amount
    : typeof item.value === 'number' ? item.value
      : null;
  return {
    nutrientId: nutrient.id == null ? null : String(nutrient.id),
    nutrientNumber: nutrient.number == null ? (item.nutrientNumber == null ? null : String(item.nutrientNumber)) : String(nutrient.number),
    name: nutrient.name || item.name || null,
    unit: nutrient.unitName || item.unitName || item.unit || null,
    amount,
    derivationCode: item.foodNutrientDerivation && item.foodNutrientDerivation.code
      ? item.foodNutrientDerivation.code
      : null,
    loq: typeof item.loq === 'number' ? item.loq : null,
  };
}

function normalizeFoodDetails(food) {
  if (!food || typeof food !== 'object' || !Number.isInteger(Number(food.fdcId))) {
    throw new UsdaApiError('USDA_INVALID_RESPONSE', 'USDA returned food details without a valid FDC ID.');
  }
  const dataType = food.dataType || null;
  let basis = 'provider_defined';
  if (dataType === 'Foundation') basis = 'per_100g_edible_portion';
  else if (dataType === 'SR Legacy' || dataType === 'Survey (FNDDS)') basis = 'per_100g_source_food';
  else if (dataType === 'Branded') basis = 'per_100g_provider_standardized';

  return {
    provider: 'USDA_FDC',
    externalFoodId: String(food.fdcId),
    description: food.description || null,
    dataType,
    publicationDate: food.publicationDate || null,
    foodCategory: food.foodCategory && food.foodCategory.description ? food.foodCategory.description : null,
    basis,
    preparationState: 'not_inferred',
    nutrients: Array.isArray(food.foodNutrients) ? food.foodNutrients.map(normalizeNutrient) : [],
    sourceUri: `https://fdc.nal.usda.gov/food-details/${food.fdcId}/nutrients`,
    note: 'USDA source record normalized for review. Check data type and food description before associating it with a canonical ingredient.',
  };
}

function createUsdaClient({
  apiKey = process.env.FDC_API_KEY,
  baseUrl = DEFAULT_BASE_URL,
  fetchImpl = globalThis.fetch,
  timeoutMs = 10000,
  defaultDataTypes = DEFAULT_DATA_TYPES,
  now = () => new Date().toISOString(),
} = {}) {
  if (typeof fetchImpl !== 'function') throw new TypeError('A Fetch-compatible fetchImpl function is required.');
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1) throw new TypeError('timeoutMs must be a positive integer.');
  const normalizedBase = String(baseUrl).replace(/\/+$/, '');

  async function request(endpoint, { method = 'GET', body = null } = {}) {
    if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) {
      throw new UsdaApiError('USDA_API_KEY_MISSING', 'FDC_API_KEY is not configured. Set it in the local environment before making USDA requests.');
    }
    const url = new URL(`${normalizedBase}${endpoint}`);
    // USDA's official API guide documents the api_key query parameter.
    // Never print this URL or include it in thrown errors because it contains a credential.
    url.searchParams.set('api_key', apiKey.trim());
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    let response;
    try {
      response = await fetchImpl(url.toString(), {
        method,
        headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal: controller.signal,
      });
    } catch (error) {
      if (error && error.name === 'AbortError') {
        throw new UsdaApiError('USDA_TIMEOUT', `USDA request exceeded the ${timeoutMs} ms timeout.`, { retryable: true });
      }
      throw new UsdaApiError('USDA_NETWORK_ERROR', 'Could not reach USDA FoodData Central.', {
        retryable: true,
        details: { cause: error && error.name ? error.name : 'network_error' },
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response || typeof response.ok !== 'boolean') {
      throw new UsdaApiError('USDA_INVALID_RESPONSE', 'USDA request did not return a valid HTTP response.');
    }
    if (!response.ok) {
      const statusCode = response.status;
      const retryAfter = response.headers && response.headers.get ? response.headers.get('Retry-After') : null;
      const code = statusCode === 401 || statusCode === 403 ? 'USDA_AUTH_ERROR'
        : statusCode === 404 ? 'USDA_RECORD_NOT_FOUND'
          : statusCode === 429 ? 'USDA_RATE_LIMITED'
            : statusCode >= 500 ? 'USDA_UPSTREAM_ERROR' : 'USDA_REQUEST_REJECTED';
      throw new UsdaApiError(code, `USDA request failed with HTTP ${statusCode}.`, {
        statusCode,
        retryable: statusCode === 429 || statusCode >= 500,
        retryAfter,
      });
    }

    try {
      return {
        data: await response.json(),
        rateLimit: {
          limit: response.headers && response.headers.get ? response.headers.get('X-RateLimit-Limit') : null,
          remaining: response.headers && response.headers.get ? response.headers.get('X-RateLimit-Remaining') : null,
        },
      };
    } catch {
      throw new UsdaApiError('USDA_INVALID_RESPONSE', 'USDA returned a non-JSON or malformed response.', { statusCode: response.status });
    }
  }

  async function searchFoods(query, options = {}) {
    if (typeof query !== 'string' || !query.trim()) throw new TypeError('query must be a non-empty string.');
    const pageSize = options.pageSize == null ? 10 : options.pageSize;
    const pageNumber = options.pageNumber == null ? 1 : options.pageNumber;
    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 200) throw new TypeError('pageSize must be an integer from 1 to 200.');
    if (!Number.isInteger(pageNumber) || pageNumber < 1) throw new TypeError('pageNumber must be a positive integer.');
    const dataTypes = options.dataTypes == null ? defaultDataTypes : options.dataTypes;
    if (!Array.isArray(dataTypes) || dataTypes.length === 0 || dataTypes.some((type) => !ALLOWED_DATA_TYPES.has(type))) {
      throw new TypeError(`dataTypes must be a non-empty array of: ${[...ALLOWED_DATA_TYPES].join(', ')}.`);
    }
    const payload = { query: query.trim(), dataType: dataTypes, pageSize, pageNumber };
    const response = await request('/foods/search', { method: 'POST', body: payload });
    const data = response.data;
    if (!data || !Array.isArray(data.foods)) {
      throw new UsdaApiError('USDA_INVALID_RESPONSE', 'USDA food search response did not contain a foods array.');
    }
    const candidates = data.foods.map((food) => ({
      fdcId: Number.isInteger(Number(food.fdcId)) ? Number(food.fdcId) : null,
      description: food.description || null,
      dataType: food.dataType || null,
      publicationDate: food.publicationDate || null,
      foodCategory: food.foodCategory || null,
      brandOwner: food.brandOwner || null,
    })).filter((food) => food.fdcId !== null);
    return {
      status: candidates.length ? 'candidates_found' : 'not_found',
      query: query.trim(),
      candidates,
      rateLimit: response.rateLimit,
      note: 'Search results are candidates only. Review description, data type, preparation state and source record before linking to an ingredient.',
    };
  }

  async function getFoodDetails(fdcId, options = {}) {
    const id = String(fdcId);
    if (!/^\d+$/.test(id) || Number(id) <= 0) throw new TypeError('fdcId must be a positive numeric identifier.');
    const response = await request(`/food/${encodeURIComponent(id)}`, { method: 'GET' });
    const normalized = normalizeFoodDetails(response.data);
    const allowedDataTypes = options.allowedDataTypes || defaultDataTypes;
    if (!allowedDataTypes.includes(normalized.dataType)) {
      throw new UsdaApiError('USDA_DATA_TYPE_NOT_ALLOWED', `USDA record data type ${normalized.dataType || 'unknown'} is not allowed for this lookup.`, {
        details: { fdcId: id, dataType: normalized.dataType },
      });
    }
    normalized.rateLimit = response.rateLimit;
    normalized.retrievedAt = now();
    return normalized;
  }

  return Object.freeze({ searchFoods, getFoodDetails });
}

module.exports = {
  createUsdaClient,
  normalizeFoodDetails,
  normalizeNutrient,
  UsdaApiError,
  DEFAULT_BASE_URL,
  DEFAULT_DATA_TYPES,
};
