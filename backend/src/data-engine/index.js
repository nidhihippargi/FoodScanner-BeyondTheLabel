'use strict';

const { loadConfig } = require('./config');
const { OffClient } = require('./adapters/off_client');
const { mapOffProduct } = require('./mapping/off_mapper');
const { validateProductRecord } = require('./validation/validators');
const { ValidationError } = require('./errors');
const { mapOcrPayload: mapOcrPayloadFn } = require('./mapping/ocr_mapper');
const { mergeObservations: mergeObservationsFn } = require('./merging/source_merger');

function createDataEngine({ config = loadConfig(), fetchImpl = globalThis.fetch, now } = {}) {
  const offClient = new OffClient({
    baseUrl: config.offBaseUrl, apiVersion: config.offApiVersion, userAgent: config.offUserAgent,
    timeoutMs: config.offTimeoutMs, fields: config.offFields,
    basicAuthUser: config.offBasicAuthUser, basicAuthPassword: config.offBasicAuthPassword, fetchImpl,
  });
  return {
    async lookupByBarcode(barcode) {
      const parsed = await offClient.lookupByBarcode(barcode);
      const product = mapOffProduct(parsed, { now });
      const validation = validateProductRecord(product);
      if (!validation.valid) throw new ValidationError('Mapped Open Food Facts product failed canonical validation.', { errors: validation.errors });
      return { outcome: parsed.outcome, product, validation, warnings: parsed.warnings };
    },
    mapOcrPayload(payload, options) {
      const product = mapOcrPayloadFn(payload, options);
      const validation = validateProductRecord(product);
      if (!validation.valid) throw new ValidationError('Mapped OCR payload failed canonical validation.', { errors: validation.errors });
      return product;
    },
    mergeObservations(existing, incoming, options) {
      const product = mergeObservationsFn(existing, incoming, options);
      const validation = validateProductRecord(product);
      if (!validation.valid) throw new ValidationError('Merged product failed canonical validation.', { errors: validation.errors });
      return product;
    },
    validateProductRecord,
  };
}

module.exports = { createDataEngine, loadConfig, OffClient, mapOffProduct, mapOcrPayload: mapOcrPayloadFn, mergeObservations: mergeObservationsFn };
