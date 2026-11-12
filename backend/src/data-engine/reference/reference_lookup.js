'use strict';

const { createReferenceRepository } = require('./reference_repository');

/** Ingredient, generic-composition and dietary-guideline lookup facade. */
function createReferenceLookup(options = {}) {
  const repository = options.repository || createReferenceRepository(options);
  return Object.freeze({
    getIngredientReference: repository.getIngredientReference,
    findExactIngredientCandidates: repository.findExactIngredientCandidates,
    getNutrientComposition: repository.getNutrientComposition,
    getDietaryGuidelines: repository.getDietaryGuidelines,
    getDatasetSummary: repository.getDatasetSummary,
  });
}

module.exports = { createReferenceLookup };
