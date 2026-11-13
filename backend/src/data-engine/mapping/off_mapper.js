'use strict';

const { computeQualitySummary } = require('../quality/quality_checks');
const { mapOffNutrients } = require('./nutrient_mapper');

function field(value, sourceId, extractionMethod, sourceField) {
  const present = value !== undefined && value !== null && String(value).trim() !== '';
  return {
    value: present ? String(value).trim() : null,
    status: present ? 'available' : 'missing',
    provenance: present ? [{ sourceId, extractionMethod, sourceField }] : [],
  };
}
function nowIso() { return new Date().toISOString(); }

function mapOffProduct(parsed, { now = nowIso, recordId } = {}) {
  if (!parsed?.product || !parsed.barcode) throw new TypeError('A parsed OFF product is required.');
  const p = parsed.product;
  const timestamp = now();
  const sourceId = `off-${parsed.barcode}-${timestamp.replace(/[^0-9]/g, '').slice(0, 14)}`;
  const sourceUri = `https://world.openfoodfacts.org/product/${parsed.barcode}`;
  const ingredientsText = p.ingredients_text ?? p.ingredients_text_en ?? null;
  const nameValue = p.product_name ?? p.abbreviated_product_name ?? null;
  const brandValue = p.brands ?? null;
  const quantityText = p.quantity ?? p.product_quantity ?? null;
  const servingText = p.serving_size ?? null;

  const packageQuantity = {
    rawText: quantityText ? String(quantityText) : null,
    value: null,
    unit: 'unknown',
    status: quantityText ? 'unverified' : 'missing',
    provenance: quantityText ? [{ sourceId, extractionMethod: 'barcode_lookup', sourceField: p.quantity ? 'product.quantity' : 'product.product_quantity' }] : [],
  };
  const ingredientStatus = ingredientsText ? 'available' : 'missing';
  const ingredients = {
    rawText: ingredientsText ? String(ingredientsText) : null,
    language: p.lang || p.lc || null,
    status: ingredientStatus,
    provenance: ingredientsText ? [{ sourceId, extractionMethod: 'barcode_lookup', sourceField: p.ingredients_text ? 'product.ingredients_text' : 'product.ingredients_text_en' }] : [],
  };
  const servingSize = {
    rawText: servingText ? String(servingText) : null,
    value: null,
    unit: null,
    status: servingText ? 'unverified' : 'missing',
    provenance: servingText ? [{ sourceId, extractionMethod: 'barcode_lookup', sourceField: 'product.serving_size' }] : [],
  };

  const images = [];
  const addImage = (url, kind) => {
    if (typeof url === 'string' && /^https?:\/\//i.test(url)) images.push({ url, kind, sourceId });
  };
  addImage(p.image_front_url, 'front');
  addImage(p.image_ingredients_url, 'ingredients');
  addImage(p.image_nutrition_url, 'nutrition');
  const selected = p.images?.selected || p.images?.selected_images || null;
  if (selected && typeof selected === 'object') {
    for (const kind of ['front', 'ingredients', 'nutrition']) {
      const item = selected[kind];
      const url = item?.display?.en || item?.display?.url || item?.display || item?.url;
      if (typeof url === 'string') addImage(url, kind);
    }
  }

  const lastModified = Number(p.last_modified_t);
  const sourceUpdatedAt = Number.isFinite(lastModified) && lastModified > 0 ? new Date(lastModified * 1000).toISOString() : null;
  const sourceRecord = {
    sourceId,
    sourceType: 'open_food_facts',
    extractionMethod: 'barcode_lookup',
    retrievedAt: timestamp,
    sourceUpdatedAt,
    externalRecordId: String(p.code ?? parsed.barcode),
    sourceUri,
  };
  const record = {
    schemaVersion: '1.0.0',
    recordId: recordId || `off:${parsed.barcode}`,
    identifiers: { gtin: {
      value: String(parsed.barcode), status: 'available',
      provenance: [{ sourceId, extractionMethod: 'barcode_lookup', sourceField: 'product.code' }],
    } },
    productName: field(nameValue, sourceId, 'barcode_lookup', p.product_name ? 'product.product_name' : 'product.abbreviated_product_name'),
    brand: field(brandValue, sourceId, 'barcode_lookup', 'product.brands'),
    packageQuantity,
    ingredients,
    nutrition: {
      declaredBasis: p.nutrition_data_per === '100g' ? 'per_100g' : p.nutrition_data_per === 'serving' ? 'per_serving' :
        (p.nutrition?.aggregated_set?.per === '100g' ? 'per_100g' : p.nutrition?.aggregated_set?.per === '100ml' ? 'per_100ml' : p.nutrition?.aggregated_set?.per === 'serving' ? 'per_serving' : 'unknown'),
      servingSize,
      nutrients: mapOffNutrients(p, sourceId),
    },
    images,
    sourceRecords: [sourceRecord],
    conflicts: [],
    quality: { recordStatus: 'partial', missingFields: [], unverifiedFields: [] },
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  record.quality = computeQualitySummary(record);
  return record;
}

module.exports = { mapOffProduct, field };
