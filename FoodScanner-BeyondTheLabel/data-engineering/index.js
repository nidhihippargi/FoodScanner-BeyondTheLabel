'use strict';
const { fetchProduct, normalizeOffProduct } = require('./openFoodFacts');
const { parseOcrText, buildProduct, splitIngredients, extractAdditives, extractClaims } = require('./ocrParser');
const { MOCK_PRODUCTS } = require('./mockProducts');

/**
 * Resolve a barcode: live Open Food Facts first (unless offline), then bundled mock data.
 * Resolves { product, source } or null.
 */
async function getProductByBarcode(barcode, opts = {}) {
  if (!opts.offline) {
    const live = await fetchProduct(barcode, opts);
    if (live) return { product: live, source: 'openfoodfacts' };
  }
  const mock = MOCK_PRODUCTS[barcode];
  return mock ? { product: buildProduct(mock), source: 'mock' } : null;
}

module.exports = {
  getProductByBarcode, fetchProduct, normalizeOffProduct,
  parseOcrText, normalizeProduct: buildProduct, buildProduct, splitIngredients, extractAdditives, extractClaims,
  MOCK_PRODUCTS,
};
