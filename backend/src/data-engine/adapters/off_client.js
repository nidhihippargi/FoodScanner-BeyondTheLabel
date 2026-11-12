'use strict';

const { DataEngineError, OffNotFoundError, OffInvalidResponseError, OffUpstreamError, OffNetworkError, ValidationError } = require('../errors');
const { parseOffResponse } = require('./off_parser');

const GTIN_RE = /^\d{8,14}$/;

class OffClient {
  constructor({ baseUrl = 'https://world.openfoodfacts.org', apiVersion = 'v3', userAgent, timeoutMs = 8000, fields = [], basicAuthUser = '', basicAuthPassword = '', fetchImpl = globalThis.fetch } = {}) {
    if (!userAgent || !String(userAgent).trim()) throw new TypeError('A custom OFF User-Agent is required.');
    if (typeof fetchImpl !== 'function') throw new TypeError('A Fetch-compatible implementation is required.');
    this.baseUrl = String(baseUrl).replace(/\/+$/, '');
    this.apiVersion = apiVersion;
    this.userAgent = String(userAgent).trim();
    this.timeoutMs = timeoutMs;
    this.fields = fields;
    this.basicAuthUser = basicAuthUser;
    this.basicAuthPassword = basicAuthPassword;
    this.fetchImpl = fetchImpl;
  }

  async lookupByBarcode(barcode) {
    const code = String(barcode ?? '').trim();
    if (!GTIN_RE.test(code)) throw new ValidationError('Barcode must contain 8 to 14 digits and must be kept as a string.', { barcode: code });
    const url = new URL(`${this.baseUrl}/api/${this.apiVersion}/product/${encodeURIComponent(code)}`);
    if (this.fields.length) url.searchParams.set('fields', this.fields.join(','));
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetchImpl(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent': this.userAgent,
          ...(this.basicAuthUser && this.basicAuthPassword ? { Authorization: `Basic ${Buffer.from(`${this.basicAuthUser}:${this.basicAuthPassword}`).toString('base64')}` } : {}),
        },
        signal: controller.signal,
      });

      if (response.status === 404) throw new OffNotFoundError(code, { upstreamStatus: 404 });
      if (!response.ok) {
        const retryAfter = response.headers?.get?.('retry-after') || null;
        throw new OffUpstreamError(`Open Food Facts returned HTTP ${response.status}.`, {
          statusCode: response.status === 429 || response.status >= 500 ? 503 : 502,
          retryable: response.status === 429 || response.status >= 500,
          details: { upstreamStatus: response.status, retryAfter, barcode: code },
        });
      }

      let body;
      try { body = await response.json(); }
      catch { throw new OffInvalidResponseError('Open Food Facts returned invalid JSON.', { barcode: code }); }
      return parseOffResponse(body, code);
    } catch (error) {
      if (error instanceof DataEngineError) throw error;
      if (error?.name === 'AbortError' || error?.name === 'TimeoutError') {
        throw new OffNetworkError('Open Food Facts request timed out.', { barcode: code, timeoutMs: this.timeoutMs });
      }
      throw new OffNetworkError('Could not reach Open Food Facts.', { barcode: code, cause: error?.message });
    } finally {
      clearTimeout(timeout);
    }
  }
}

module.exports = { OffClient, GTIN_RE };
