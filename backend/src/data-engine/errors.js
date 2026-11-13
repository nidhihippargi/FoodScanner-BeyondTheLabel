'use strict';

class DataEngineError extends Error {
  constructor(message, { code = 'DATA_ENGINE_ERROR', statusCode = 500, retryable = false, details = {} } = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.retryable = retryable;
    this.details = details;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

class ConfigurationError extends DataEngineError {
  constructor(message, details) { super(message, { code: 'CONFIGURATION_ERROR', statusCode: 500, details }); }
}
class ValidationError extends DataEngineError {
  constructor(message, details) { super(message, { code: 'VALIDATION_ERROR', statusCode: 400, details }); }
}
class OffNotFoundError extends DataEngineError {
  constructor(barcode, details) { super(`Open Food Facts has no product for barcode ${barcode}.`, { code: 'OFF_PRODUCT_NOT_FOUND', statusCode: 404, details }); }
}
class OffInvalidResponseError extends DataEngineError {
  constructor(message, details) { super(message, { code: 'OFF_INVALID_RESPONSE', statusCode: 502, details }); }
}
class OffUpstreamError extends DataEngineError {
  constructor(message, { statusCode = 502, retryable = false, details = {} } = {}) {
    super(message, { code: 'OFF_UPSTREAM_ERROR', statusCode, retryable, details });
  }
}
class OffNetworkError extends DataEngineError {
  constructor(message, details) { super(message, { code: 'OFF_NETWORK_ERROR', statusCode: 503, retryable: true, details }); }
}
class ConflictError extends DataEngineError {
  constructor(message, details) { super(message, { code: 'PRODUCT_CONFLICT', statusCode: 409, details }); }
}

module.exports = {
  DataEngineError, ConfigurationError, ValidationError,
  OffNotFoundError, OffInvalidResponseError, OffUpstreamError, OffNetworkError,
  ConflictError,
};
