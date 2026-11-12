'use strict';

const fs = require('node:fs');
const path = require('node:path');

class ReferenceDataError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'ReferenceDataError';
    this.code = code;
    this.details = details;
  }
}

const DEFAULT_DATA_DIR = path.resolve(__dirname, '../../../../data-engineering');
const DATA_FILES = Object.freeze({
  ingredients: 'ingredient_reference.json',
  compositions: 'nutrient_composition.json',
  additives: 'additive_reference.json',
  guidelines: 'dietary_guidelines.json',
  legacyAliases: 'ingredient_aliases.json',
});

function normalizeExact(value) {
  if (typeof value !== 'string') return '';
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en');
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function readRecords(dataDir, filename, { optional = false } = {}) {
  const fullPath = path.join(dataDir, filename);
  if (!fs.existsSync(fullPath)) {
    if (optional) return [];
    throw new ReferenceDataError('REFERENCE_DATASET_MISSING', `Required reference dataset is missing: ${filename}`, { filename });
  }

  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  } catch (error) {
    throw new ReferenceDataError('REFERENCE_DATASET_INVALID_JSON', `Reference dataset is not valid JSON: ${filename}`, {
      filename,
      reason: error.message,
    });
  }

  const records = Array.isArray(parsed) ? parsed : parsed && Array.isArray(parsed.records) ? parsed.records : null;
  if (!records) {
    throw new ReferenceDataError('REFERENCE_DATASET_INVALID_SHAPE', `Reference dataset must be an array or contain a records array: ${filename}`, { filename });
  }
  return records;
}

function assertUniqueIds(records, idField, datasetName) {
  const seen = new Set();
  for (const [index, record] of records.entries()) {
    const id = record && record[idField];
    if (typeof id !== 'string' || !id.trim()) {
      throw new ReferenceDataError('REFERENCE_DATASET_INVALID_RECORD', `${datasetName} record ${index} has no valid ${idField}.`, { index, idField });
    }
    if (seen.has(id)) {
      throw new ReferenceDataError('REFERENCE_DATASET_DUPLICATE_ID', `${datasetName} contains duplicate ${idField}: ${id}`, { id, idField });
    }
    seen.add(id);
  }
}

function result(status, payload = {}) {
  return { status, ...payload };
}

function inDateWindow(record, asOfDate) {
  if (!asOfDate) return true;
  const date = new Date(`${asOfDate}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new TypeError('asOfDate must be a valid YYYY-MM-DD date.');
  }
  if (record.validFrom && new Date(`${record.validFrom}T00:00:00.000Z`) > date) return false;
  if (record.validTo && new Date(`${record.validTo}T00:00:00.000Z`) < date) return false;
  return true;
}

/**
 * Read-only repository for the curated Ingredient Intelligence JSON datasets.
 * Ingredient name lookup is exact-only and returns candidates for M3 review;
 * it does not perform fuzzy matching or decide ingredient identity.
 */
function createReferenceRepository({ dataDir = DEFAULT_DATA_DIR, datasets = null } = {}) {
  const loaded = datasets || {
    ingredients: readRecords(dataDir, DATA_FILES.ingredients),
    compositions: readRecords(dataDir, DATA_FILES.compositions),
    additives: readRecords(dataDir, DATA_FILES.additives),
    guidelines: readRecords(dataDir, DATA_FILES.guidelines),
    legacyAliases: readRecords(dataDir, DATA_FILES.legacyAliases, { optional: true }),
  };

  for (const [key, idField] of [
    ['ingredients', 'ingredientId'],
    ['compositions', 'nutrientCompositionId'],
    ['additives', 'additiveId'],
    ['guidelines', 'guidelineId'],
  ]) {
    if (!Array.isArray(loaded[key])) {
      throw new ReferenceDataError('REFERENCE_DATASET_INVALID_SHAPE', `Dataset ${key} must be an array.`, { dataset: key });
    }
    assertUniqueIds(loaded[key], idField, key);
  }
  if (!Array.isArray(loaded.legacyAliases || [])) {
    throw new ReferenceDataError('REFERENCE_DATASET_INVALID_SHAPE', 'Legacy ingredient aliases must be an array.', { dataset: 'legacyAliases' });
  }

  const ingredientById = new Map(loaded.ingredients.map((record) => [record.ingredientId, record]));
  const compositionByIngredientId = new Map();
  for (const record of loaded.compositions) {
    const list = compositionByIngredientId.get(record.ingredientId) || [];
    list.push(record);
    compositionByIngredientId.set(record.ingredientId, list);
  }
  const additiveById = new Map(loaded.additives.map((record) => [record.additiveId, record]));
  const guidelineById = new Map(loaded.guidelines.map((record) => [record.guidelineId, record]));

  const ingredientNames = [];
  for (const record of loaded.ingredients) {
    ingredientNames.push({
      sourceDataset: 'ingredient_reference',
      candidateId: record.ingredientId,
      canonicalName: record.canonicalName,
      matchType: 'canonical_name',
      record,
    });
    if (record.displayName) ingredientNames.push({
      sourceDataset: 'ingredient_reference', candidateId: record.ingredientId,
      canonicalName: record.canonicalName, matchType: 'display_name', matchedName: record.displayName, record,
    });
    for (const alias of record.aliases || []) {
      const aliasName = typeof alias === 'string' ? alias : alias && alias.name;
      if (aliasName) ingredientNames.push({
        sourceDataset: 'ingredient_reference', candidateId: record.ingredientId,
        canonicalName: record.canonicalName, matchType: 'ingredient_alias', matchedName: aliasName, record,
      });
    }
  }

  // The existing 27-entry alias list uses an older ID vocabulary. It remains a
  // candidate source only; a canonical reference link is attached only when
  // the canonical names match exactly.
  for (const aliasRecord of loaded.legacyAliases || []) {
    const linked = loaded.ingredients.find((record) => normalizeExact(record.canonicalName) === normalizeExact(aliasRecord.canonicalName));
    ingredientNames.push({
      sourceDataset: 'ingredient_aliases',
      candidateId: aliasRecord.ingredientId,
      canonicalName: aliasRecord.canonicalName,
      matchType: 'legacy_alias_candidate',
      record: aliasRecord,
      linkedIngredientId: linked ? linked.ingredientId : null,
    });
    for (const alias of aliasRecord.aliases || []) {
      const aliasName = typeof alias === 'string' ? alias : alias && alias.name;
      if (aliasName) ingredientNames.push({
        sourceDataset: 'ingredient_aliases',
        candidateId: aliasRecord.ingredientId,
        canonicalName: aliasRecord.canonicalName,
        matchType: 'legacy_alias_candidate',
        matchedName: aliasName,
        record: aliasRecord,
        linkedIngredientId: linked ? linked.ingredientId : null,
      });
    }
  }

  function getIngredientReference(ingredientId) {
    if (typeof ingredientId !== 'string' || !ingredientId.trim()) throw new TypeError('ingredientId must be a non-empty string.');
    const record = ingredientById.get(ingredientId);
    return record ? result('found', { record: clone(record) }) : result('not_found', { ingredientId });
  }

  function findExactIngredientCandidates(name) {
    const normalized = normalizeExact(name);
    if (!normalized) throw new TypeError('name must be a non-empty string.');
    const matches = ingredientNames.filter((candidate) => {
      const candidateNames = [candidate.canonicalName, candidate.matchedName];
      if (candidate.record && candidate.record.displayName) candidateNames.push(candidate.record.displayName);
      return candidateNames.some((candidateName) => normalizeExact(candidateName) === normalized);
    });
    const unique = new Map();
    for (const match of matches) {
      const key = `${match.sourceDataset}:${match.candidateId}:${match.matchType}`;
      if (!unique.has(key)) unique.set(key, match);
    }
    const candidates = [...unique.values()].map((candidate) => ({
      sourceDataset: candidate.sourceDataset,
      candidateId: candidate.candidateId,
      canonicalName: candidate.canonicalName,
      matchType: candidate.matchType,
      ...(candidate.matchedName ? { matchedName: candidate.matchedName } : {}),
      ...(candidate.linkedIngredientId ? { linkedIngredientId: candidate.linkedIngredientId } : {}),
      reviewStatus: candidate.record && candidate.record.reviewStatus
        ? candidate.record.reviewStatus
        : candidate.record && candidate.record.classification && candidate.record.classification.reviewStatus
          ? candidate.record.classification.reviewStatus
          : 'not_recorded',
      record: clone(candidate.record),
    }));
    if (!candidates.length) return result('unmatched', { query: name, candidates: [], needsM3Confirmation: true });
    return result(candidates.length === 1 ? 'unique_candidate' : 'ambiguous', {
      query: name,
      candidates,
      needsM3Confirmation: true,
      note: 'Exact textual candidates only. M3 must approve ingredient identity; no fuzzy or semantic match was performed.',
    });
  }

  function getNutrientComposition(ingredientId, options = {}) {
    if (typeof ingredientId !== 'string' || !ingredientId.trim()) throw new TypeError('ingredientId must be a non-empty string.');
    const { provider, preparationState, includeNeedsReview = true } = options;
    let records = compositionByIngredientId.get(ingredientId) || [];
    if (provider) records = records.filter((record) => record.source && record.source.provider === provider);
    if (preparationState) records = records.filter((record) => record.preparationState === preparationState);
    if (!includeNeedsReview) records = records.filter((record) => record.reviewStatus === 'approved' || record.reviewStatus === 'reviewed');
    if (!records.length) return result('not_found', { ingredientId, records: [] });
    return result('found', {
      ingredientId,
      records: clone(records),
      warnings: records.filter((record) => record.reviewStatus !== 'approved' && record.reviewStatus !== 'reviewed')
        .map((record) => ({ recordId: record.nutrientCompositionId, reviewStatus: record.reviewStatus || 'not_recorded' })),
      note: 'These are generic source-food composition records, not quantities used in a packaged product.',
    });
  }

  function getAdditiveReference(additiveId) {
    if (typeof additiveId !== 'string' || !additiveId.trim()) throw new TypeError('additiveId must be a non-empty string.');
    const record = additiveById.get(additiveId);
    return record ? result('found', { record: clone(record) }) : result('not_found', { additiveId });
  }

  function getAdditiveByInsNumber(insNumber) {
    if (typeof insNumber !== 'string' || !/^\d{3,4}[a-zA-Z]?$/.test(insNumber.trim())) {
      throw new TypeError('insNumber must be a valid INS identifier string.');
    }
    const matches = loaded.additives.filter((record) => String(record.insNumber || '').toLowerCase() === insNumber.trim().toLowerCase());
    if (!matches.length) return result('not_found', { insNumber });
    if (matches.length > 1) return result('ambiguous', { insNumber, records: clone(matches) });
    return result('found', { record: clone(matches[0]) });
  }

  function findExactAdditiveCandidates(query) {
    const normalized = normalizeExact(query);
    if (!normalized) throw new TypeError('query must be a non-empty string.');
    const matches = loaded.additives.filter((record) => {
      const values = [record.additiveId, record.canonicalName, record.insNumber, ...(record.aliases || [])];
      return values.some((value) => normalizeExact(String(value || '')) === normalized);
    });
    if (!matches.length) return result('unmatched', { query, records: [] });
    return result(matches.length === 1 ? 'unique_candidate' : 'ambiguous', {
      query, records: clone(matches), needsM3Confirmation: true,
      note: 'Exact textual/identifier candidates only; no fuzzy additive identification was performed.',
    });
  }

  function getDietaryGuidelines(query = {}) {
    if (!query || typeof query !== 'object' || Array.isArray(query)) throw new TypeError('query must be an object.');
    const { nutrientOrTopic, authority, jurisdiction, lifeStage, asOfDate } = query;
    let records = loaded.guidelines;
    if (nutrientOrTopic) records = records.filter((record) => normalizeExact(record.nutrientOrTopic) === normalizeExact(nutrientOrTopic));
    if (authority) records = records.filter((record) => normalizeExact(record.authority) === normalizeExact(authority));
    if (jurisdiction) records = records.filter((record) => normalizeExact(record.jurisdiction) === normalizeExact(jurisdiction));
    if (lifeStage) records = records.filter((record) => record.population && record.population.lifeStage === lifeStage);
    if (asOfDate) records = records.filter((record) => inDateWindow(record, asOfDate));
    if (!records.length) return result('not_found', { query: clone(query), records: [] });
    return result('found', {
      query: clone(query),
      records: clone(records),
      note: 'Guideline records retain their original population, jurisdiction, unit and dietary basis. They are not per-product limits.',
    });
  }

  function getDatasetSummary() {
    return {
      ingredients: loaded.ingredients.length,
      nutrientCompositions: loaded.compositions.length,
      additives: loaded.additives.length,
      dietaryGuidelines: loaded.guidelines.length,
      legacyAliasCandidates: (loaded.legacyAliases || []).length,
    };
  }

  return Object.freeze({
    getIngredientReference,
    findExactIngredientCandidates,
    getNutrientComposition,
    getAdditiveReference,
    getAdditiveByInsNumber,
    findExactAdditiveCandidates,
    getDietaryGuidelines,
    getDatasetSummary,
  });
}

module.exports = { createReferenceRepository, normalizeExact, ReferenceDataError };
