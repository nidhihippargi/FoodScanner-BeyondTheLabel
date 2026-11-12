'use strict';
/**
 * REST contract (all responses): { success: true, data } | { success: false, error: { code, message } }
 *   GET    /api/health
 *   POST   /api/scan/barcode  { barcode }                      -> { barcode, product, source }
 *   POST   /api/scan/ocr      { text, engineConfidence? }      -> { ocr, product }
 *   POST   /api/analyze       { barcode | text | product, preferences? } -> { scanId, method, product, analysis }
 *   GET    /api/history       ?limit=50
 *   DELETE /api/history
 */
const vision = require('../../vision');
const dataEng = require('../../data-engineering');
const verification = require('../../verification');
const ScanLog = require('../models/ScanLog');

const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });
const fail = (res, status, code, message) => res.status(status).json({ success: false, error: { code, message } });
const wrap = (fn) => (req, res) => Promise.resolve(fn(req, res)).catch((e) => fail(res, 500, 'INTERNAL_ERROR', e.message || 'Unexpected error'));
const offline = (req) => Boolean((req.body && req.body.offline) || process.env.OFFLINE === '1');

async function lookup(barcodeInput, req) {
  const v = vision.validateBarcode(barcodeInput);
  if (!v.valid) return { error: { status: 400, code: 'INVALID_BARCODE', message: v.error } };
  const found = await dataEng.getProductByBarcode(v.normalized, { offline: offline(req) });
  if (!found) return { error: { status: 404, code: 'PRODUCT_NOT_FOUND', message: 'Product not found. Try scanning the nutrition label instead.' } };
  return { barcode: v.normalized, ...found };
}

function ocrToProduct(text, engineConfidence) {
  const ocr = vision.scoreOcrConfidence(text, engineConfidence);
  return { ocr, product: dataEng.parseOcrText(ocr.cleanedText) };
}

const handlers = {
  health: wrap(async (req, res) => ok(res, { status: 'ok', db: ScanLog.mode(), time: new Date().toISOString() })),

  scanBarcode: wrap(async (req, res) => {
    const r = await lookup((req.body || {}).barcode, req);
    if (r.error) return fail(res, r.error.status, r.error.code, r.error.message);
    return ok(res, { barcode: r.barcode, product: r.product, source: r.source });
  }),

  scanOcr: wrap(async (req, res) => {
    const { text, engineConfidence } = req.body || {};
    if (typeof text !== 'string' || text.trim().length < 5) return fail(res, 400, 'INVALID_TEXT', 'Provide OCR text (at least 5 characters).');
    return ok(res, ocrToProduct(text, engineConfidence));
  }),

  analyze: wrap(async (req, res) => {
    const { barcode, text, product, preferences } = req.body || {};
    let resolved; let method;
    if (product && typeof product === 'object') { resolved = dataEng.normalizeProduct(product); method = 'manual'; }
    else if (barcode) {
      const r = await lookup(barcode, req);
      if (r.error) return fail(res, r.error.status, r.error.code, r.error.message);
      resolved = r.product; method = 'barcode';
    } else if (typeof text === 'string' && text.trim().length >= 5) { resolved = ocrToProduct(text).product; method = 'ocr'; }
    else return fail(res, 400, 'INVALID_REQUEST', 'Provide one of: product, barcode, or text.');
    const analysis = verification.verify(resolved, preferences || {});
    const saved = await ScanLog.save({ method, barcode: resolved.barcode, productName: resolved.name, source: resolved.source, score: analysis.score, grade: analysis.grade, product: resolved, analysis });
    return ok(res, { scanId: saved.scanId, method, product: resolved, analysis });
  }),

  history: wrap(async (req, res) => ok(res, { items: await ScanLog.list(Math.min(Number((req.query || {}).limit) || 50, 200)), db: ScanLog.mode() })),
  clearHistory: wrap(async (req, res) => { await ScanLog.clear(); return ok(res, { cleared: true }); }),
};

function createRouter() {
  const router = require('express').Router();
  router.get('/health', handlers.health);
  router.post('/scan/barcode', handlers.scanBarcode);
  router.post('/scan/ocr', handlers.scanOcr);
  router.post('/analyze', handlers.analyze);
  router.get('/history', handlers.history);
  router.delete('/history', handlers.clearHistory);
  return router;
}

module.exports = { createRouter, handlers };
