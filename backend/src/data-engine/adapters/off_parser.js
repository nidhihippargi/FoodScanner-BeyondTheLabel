'use strict';

const { OffNotFoundError, OffInvalidResponseError } = require('../errors');

function parseOffResponse(body, requestedBarcode) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new OffInvalidResponseError('Open Food Facts response must be a JSON object.');
  }
  if (body.status === 'failure') {
    const message = Array.isArray(body.errors) ? body.errors.map((item) => item?.message?.name || item?.message || '').filter(Boolean).join('; ') : '';
    if (/not found|no product|unknown product/i.test(message)) throw new OffNotFoundError(requestedBarcode, { upstreamMessage: message });
    throw new OffInvalidResponseError('Open Food Facts reported a failure without a product.', { upstreamMessage: message || null });
  }
  if (!body.product || typeof body.product !== 'object' || Array.isArray(body.product)) {
    throw new OffInvalidResponseError('Open Food Facts response does not contain a product object.', { barcode: requestedBarcode });
  }
  const product = body.product;
  const actualCode = product.code ?? body.code ?? null;
  if (actualCode && String(actualCode) !== String(requestedBarcode)) {
    throw new OffInvalidResponseError('Open Food Facts returned a product with a different barcode.', {
      requestedBarcode, returnedBarcode: String(actualCode),
    });
  }
  const useful = Boolean(
    product.product_name || product.brands || product.ingredients_text ||
    product.nutriments || product.nutrition || product.quantity || product.images
  );
  return {
    outcome: useful ? 'found' : 'incomplete',
    product,
    barcode: String(requestedBarcode),
    upstreamStatus: body.status || 'unspecified',
    warnings: Array.isArray(body.warnings) ? body.warnings : [],
    upstreamErrors: Array.isArray(body.errors) ? body.errors : [],
  };
}

module.exports = { parseOffResponse };
