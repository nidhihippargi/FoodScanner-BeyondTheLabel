'use strict';

const { computeQualitySummary } = require('../quality/quality_checks');
const { mapNutrientLabel } = require('../cleaning/nutrient_mapper');
const { ValidationError } = require('../errors');

function mapOcrPayload(payload, { now = () => new Date().toISOString(), recordId = null } = {}) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new TypeError('OCR payload must be an object.');
  const timestamp = now();
  const sourceId = `ocr-${String(payload.requestId || 'scan')}-${timestamp.replace(/[^0-9]/g, '').slice(0, 14)}`;
  const provenance = (sourceField, confidence) => [{
    sourceId, extractionMethod: 'ocr_extraction', sourceField,
    ...(typeof confidence === 'number' && confidence >= 0 && confidence <= 1 ? { confidence } : {}),
    ...(payload.capturedAt ? { observedAt: payload.capturedAt } : {}),
  }];
  const ingredientsText = payload.ingredients?.rawText ?? null;
  const ingredientPresent = typeof ingredientsText === 'string' && ingredientsText.trim() !== '';
  const barcode = payload.barcode == null ? null : String(payload.barcode).trim();
  if (barcode && !/^\d{8,14}$/.test(barcode)) throw new ValidationError('OCR barcode must contain 8 to 14 digits when supplied.');
  const allowedBases = new Set(['per_100g', 'per_100ml', 'per_serving', 'as_sold', 'unknown']);
  const declaredBasis = allowedBases.has(payload.nutrition?.declaredBasis) ? payload.nutrition.declaredBasis : 'unknown';
  const items = Array.isArray(payload.nutrition?.items) ? payload.nutrition.items : [];
  const nutrients = {};
  for (const [itemIndex, item] of items.entries()) {
    const key = mapNutrientLabel(item.sourceLabel);
    if (!key || typeof item.value !== 'number' || !Number.isFinite(item.value)) continue;
    const unit = item.unit || null;
    const basis = item.basis === 'per_100g' || item.basis === 'per_100ml' || item.basis === 'per_serving' ? item.basis : 'unknown';
    nutrients[key] = {
      originalValue: { value: item.value, unit, basis },
      standardizedValues: [],
      // OCR remains unverified until review; confidence is retained as evidence, not converted into a project-invented threshold.
      status: 'unverified',
      provenance: provenance(`nutrition.items[${itemIndex}]`, item.confidence),
    };
  }
  const product = {
    schemaVersion: '1.0.0',
    recordId: recordId || `ocr:${payload.requestId || timestamp}`,
    identifiers: { gtin: {
      value: barcode, status: barcode ? 'unverified' : 'missing',
      provenance: barcode ? provenance('barcode') : [],
    } },
    productName: { value: null, status: 'missing', provenance: [] },
    brand: { value: null, status: 'missing', provenance: [] },
    packageQuantity: { rawText: null, value: null, unit: 'unknown', status: 'missing', provenance: [] },
    ingredients: {
      rawText: ingredientPresent ? ingredientsText : null,
      language: payload.ingredients?.language || null,
      status: ingredientPresent ? 'unverified' : 'missing',
      provenance: ingredientPresent ? provenance('ingredients.rawText', payload.ingredients?.confidence) : [],
    },
    nutrition: {
      declaredBasis,
      servingSize: {
        rawText: payload.nutrition?.servingSizeText || null, value: null, unit: null,
        status: payload.nutrition?.servingSizeText ? 'unverified' : 'missing',
        provenance: payload.nutrition?.servingSizeText ? provenance('nutrition.servingSizeText') : [],
      },
      nutrients,
    },
    images: Array.isArray(payload.imageReferences) ? payload.imageReferences.filter((item) => item && /^https?:\/\//i.test(item.url || '')).map((item) => ({ url: item.url, kind: ['front','ingredients','nutrition','other'].includes(item.kind) ? item.kind : 'other', sourceId })) : [],
    sourceRecords: [{ sourceId, sourceType: 'ocr', extractionMethod: 'ocr_extraction', retrievedAt: timestamp,
      externalRecordId: payload.requestId || null, sourceUri: null }],
    conflicts: [],
    quality: { recordStatus: 'partial', missingFields: [], unverifiedFields: [] },
    createdAt: timestamp, updatedAt: timestamp,
  };
  product.quality = computeQualitySummary(product);
  return product;
}

module.exports = { mapOcrPayload };
