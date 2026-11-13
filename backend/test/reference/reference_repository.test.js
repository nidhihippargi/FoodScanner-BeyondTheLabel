'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { createReferenceRepository, ReferenceDataError } = require('../../src/data-engine/reference/reference_repository');

const dataDir = path.resolve(__dirname, '../../../data-engineering');

test('repository loads the four reference datasets and legacy alias candidates', () => {
  const repository = createReferenceRepository({ dataDir });
  const summary = repository.getDatasetSummary();
  assert.equal(summary.ingredients, 40);
  assert.equal(summary.nutrientCompositions, 43);
  assert.equal(summary.additives, 15);
  assert.equal(summary.dietaryGuidelines, 9);
  assert.ok(summary.legacyAliasCandidates >= 0); // The working package may omit the pre-existing repo alias file; it is optional at runtime.
});

test('ingredient lookup returns an exact canonical reference', () => {
  const repository = createReferenceRepository({ dataDir });
  const result = repository.getIngredientReference('oats');
  assert.equal(result.status, 'found');
  assert.equal(result.record.ingredientId, 'oats');
  assert.equal(repository.getIngredientReference('not_a_real_ingredient').status, 'not_found');
});

test('exact ingredient alias lookup returns a candidate and does not claim final matching', () => {
  const datasets = {
    ingredients: [{ ingredientId: 'sucrose', canonicalName: 'sucrose', displayName: 'Sucrose' }],
    compositions: [], additives: [], guidelines: [],
    legacyAliases: [{ ingredientId: 'ING-001', canonicalName: 'sucrose', aliases: [{ name: 'table sugar', language: 'en', aliasType: 'variant' }], classification: { reviewStatus: 'verified' } }],
  };
  const repository = createReferenceRepository({ datasets });
  const result = repository.findExactIngredientCandidates('table sugar');
  assert.equal(result.status, 'unique_candidate');
  assert.equal(result.needsM3Confirmation, true);
  assert.ok(result.candidates.some((candidate) => candidate.sourceDataset === 'ingredient_aliases'));
  assert.equal(result.candidates[0].linkedIngredientId, 'sucrose');
  assert.match(result.note, /M3 must approve/);
});

test('nutrient composition lookup preserves source records and review warnings', () => {
  const repository = createReferenceRepository({ dataDir });
  const result = repository.getNutrientComposition('oats');
  assert.equal(result.status, 'found');
  assert.ok(result.records.length >= 1);
  assert.ok(result.records.every((record) => record.ingredientId === 'oats'));
  assert.match(result.note, /not quantities used in a packaged product/);
});

test('nutrient composition supports exact provider and preparation filters', () => {
  const repository = createReferenceRepository({ dataDir });
  const result = repository.getNutrientComposition('oats', { provider: 'USDA_FDC', preparationState: 'raw' });
  assert.equal(result.status, 'found');
  assert.ok(result.records.every((record) => record.source.provider === 'USDA_FDC' && record.preparationState === 'raw'));
});

test('additive lookup works by stable ID, exact INS and alias candidates', () => {
  const repository = createReferenceRepository({ dataDir });
  assert.equal(repository.getAdditiveReference('sodium_benzoate').status, 'found');
  const byIns = repository.getAdditiveByInsNumber('211');
  assert.equal(byIns.status, 'found');
  assert.equal(byIns.record.additiveId, 'sodium_benzoate');
  const candidate = repository.findExactAdditiveCandidates('sodium salt of benzoic acid');
  assert.equal(candidate.status, 'unique_candidate');
  assert.equal(candidate.needsM3Confirmation, true);
  assert.equal(repository.getAdditiveByInsNumber('9999').status, 'not_found');
});

test('dietary guideline lookup respects topic, authority and life-stage filters', () => {
  const repository = createReferenceRepository({ dataDir });
  const result = repository.getDietaryGuidelines({
    nutrientOrTopic: 'free_sugars',
    authority: 'WHO',
    lifeStage: 'all_population',
    asOfDate: '2026-11-13',
  });
  assert.equal(result.status, 'found');
  assert.ok(result.records.length >= 1);
  assert.ok(result.records.every((record) => record.authority === 'WHO'));
});

test('repository rejects malformed or duplicate source identifiers', () => {
  assert.throws(() => createReferenceRepository({ datasets: {
    ingredients: [{ ingredientId: 'dup' }, { ingredientId: 'dup' }],
    compositions: [], additives: [], guidelines: [], legacyAliases: [],
  } }), (error) => error instanceof ReferenceDataError && error.code === 'REFERENCE_DATASET_DUPLICATE_ID');
});

test('ingredient intelligence service exposes reference and additive lookup operations', () => {
  const { createIngredientIntelligence } = require('../../src/data-engine/reference');
  const service = createIngredientIntelligence({ dataDir });
  assert.equal(service.getIngredientReference('oats').status, 'found');
  assert.equal(service.getAdditiveByInsNumber('211').status, 'found');
  assert.equal(typeof service.searchUsdaFoods, 'function');
  assert.equal(typeof service.getUsdaFoodDetails, 'function');
});
