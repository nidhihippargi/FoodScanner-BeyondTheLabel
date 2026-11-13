'use strict';

const { createReferenceRepository } = require('./reference_repository');
const { createReferenceLookup } = require('./reference_lookup');
const { createAdditiveLookup } = require('./additive_lookup');
const { createUsdaClient } = require('./usda_client');

/**
 * Compose local reference lookups and the USDA client behind one service.
 * Construction performs no network requests; USDA is called only when one
 * of its explicitly exposed methods is invoked.
 */
function createIngredientIntelligence({
  dataDir,
  datasets,
  usdaApiKey,
  usdaBaseUrl,
  fetchImpl,
  usdaTimeoutMs,
  now,
} = {}) {
  const repository = createReferenceRepository({ dataDir, datasets });
  const referenceLookup = createReferenceLookup({ repository });
  const additiveLookup = createAdditiveLookup({ repository });
  const usda = createUsdaClient({
    ...(usdaApiKey === undefined ? {} : { apiKey: usdaApiKey }),
    ...(usdaBaseUrl === undefined ? {} : { baseUrl: usdaBaseUrl }),
    ...(fetchImpl === undefined ? {} : { fetchImpl }),
    ...(usdaTimeoutMs === undefined ? {} : { timeoutMs: usdaTimeoutMs }),
    ...(now === undefined ? {} : { now }),
  });

  return Object.freeze({
    ...referenceLookup,
    ...additiveLookup,
    searchUsdaFoods: usda.searchFoods,
    getUsdaFoodDetails: usda.getFoodDetails,
  });
}

module.exports = { createIngredientIntelligence };
