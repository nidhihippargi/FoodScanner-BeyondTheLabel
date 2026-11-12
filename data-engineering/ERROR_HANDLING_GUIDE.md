# Data Engine Error Handling Guide

## Principles

- Return/throw typed, actionable errors; do not return a fabricated product after a failed lookup.
- Distinguish a missing product from an incomplete product record.
- Distinguish source/API failure from schema-validation failure.
- Preserve upstream HTTP status/retry hints in safe diagnostic details.
- Do not expose secrets, database URIs or raw authentication headers in logs or API responses.
- M3 owns conversion of internal errors to the mobile application's public response envelope.

## Error mapping

| Internal code | Typical HTTP mapping suggestion for M3 | Meaning/action |
|---|---:|---|
| `OFF_PRODUCT_NOT_FOUND` | 404 | No OFF record; if OCR is available, allow OCR flow |
| `VALIDATION_ERROR` | 400 | Input contract invalid; explain accepted barcode format |
| `OFF_INVALID_RESPONSE` | 502 | Upstream response cannot be safely interpreted |
| `OFF_UPSTREAM_ERROR` | 502/503 | Preserve retryable metadata; respect `Retry-After` if supplied |
| `OFF_NETWORK_ERROR` | 503 | Timeout/network failure; may retry with backoff |
| `PRODUCT_CONFLICT` | 409 | Conflicting product identity/observations require handling |
| `CONFIGURATION_ERROR` | 500 | Deployment configuration issue; log safely, don't expose env values |
| `DATA_ENGINE_ERROR` | 500 | Unexpected internal failure |

These are integration recommendations, not final public API policy. M3/M6 must approve the exact HTTP status and response envelope.

## Retry policy

The client does not auto-retry. M3 should use bounded exponential backoff with jitter for retryable 429/5xx/network failures, respect `Retry-After` when valid, avoid retrying 400/404, and prevent duplicate concurrent requests for the same barcode where practical. Do not create a retry storm against OFF's per-IP limits.

## Logging

Log the request/correlation ID, source, barcode only if project privacy rules allow it, upstream status, error code, elapsed time and retryability. Redact credentials, tokens and full sensitive payloads. Agree retention with M6/project owner.
