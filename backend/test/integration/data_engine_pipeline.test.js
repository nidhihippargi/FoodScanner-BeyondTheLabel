'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Ajv2020 = require('ajv/dist/2020').default;
const addFormats = require('ajv-formats');
const { parseOffResponse } = require('../../src/data-engine/adapters/off_parser');
const { mapOffProduct } = require('../../src/data-engine/mapping/off_mapper');
const { mapOcrPayload } = require('../../src/data-engine/mapping/ocr_mapper');
const { mergeObservations } = require('../../src/data-engine/merging/source_merger');
const { computeQualitySummary } = require('../../src/data-engine/quality/quality_checks');

test('OFF fixture can be mapped, merged with OCR, and returned as a canonical record', () => {
  const offBody = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../../data-engineering/fixtures/off/product_found.json'), 'utf8'));
  const offParsed = parseOffResponse(offBody, offBody.product.code);
  const off = mapOffProduct(offParsed, { now: () => '2026-11-12T10:00:00.000Z', recordId: 'integration-product-1' });
  const ocr = mapOcrPayload({
    requestId: 'scan-77', capturedAt: '2026-11-12T10:01:00.000Z', barcode: offBody.product.code,
    ingredients: { rawText: 'Oats, dates, almonds, cocoa powder', language: 'en', confidence: 0.96 },
    nutrition: { declaredBasis: 'per_100g', servingSizeText: 'Per 3 chips', items: [] }, imageReferences: [],
  }, { now: () => '2026-11-12T10:01:01.000Z', recordId: 'integration-product-1' });
  const merged = mergeObservations(off, ocr, { now: () => '2026-11-12T10:02:00.000Z' });
  assert.equal(merged.recordId, 'integration-product-1');
  assert.equal(merged.sourceRecords.length, 2);
  assert.equal(merged.ingredients.rawText, off.ingredients.rawText);
  assert.equal(merged.conflicts.length, 0);
  assert.deepEqual(merged.quality, computeQualitySummary(merged));
  const schema = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../../data-engineering/schemas/product.schema.json'), 'utf8'));
  const ajv = new Ajv2020({ allErrors: true, strict: false }); addFormats(ajv);
  const validate = ajv.compile(schema);
  assert.equal(validate(merged), true, JSON.stringify(validate.errors));
});
