'use strict';

const { createReferenceRepository } = require('./reference_repository');

/** Exact additive ID, INS and candidate lookup facade. */
function createAdditiveLookup(options = {}) {
  const repository = options.repository || createReferenceRepository(options);
  return Object.freeze({
    getAdditiveReference: repository.getAdditiveReference,
    getAdditiveByInsNumber: repository.getAdditiveByInsNumber,
    findExactAdditiveCandidates: repository.findExactAdditiveCandidates,
  });
}

module.exports = { createAdditiveLookup };
