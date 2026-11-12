# Data Engine Integration Guide

## Intended boundary

The Data Engine is an internal module inside the Node.js backend. The mobile application calls the Express API owned by M3; it should not call Open Food Facts directly. M3 orchestrates requests and invokes Data Engine functions. M1 provides barcode/OCR observations after M1/M3/M6 agree the payload. M4 consumes M3's response. M5 consumes fixtures and test outputs. M6 approves common contracts.

## Importing the module

From backend code:

```js
const { createDataEngine } = require('./data-engine');
const engine = createDataEngine();
const result = await engine.lookupByBarcode('8901234567890');
```

`createDataEngine()` loads `.env` configuration and requires `OFF_USER_AGENT`. Pass a custom `fetchImpl` in tests. The returned object exposes `lookupByBarcode`, `mapOcrPayload`, and `mergeObservations`.

## Barcode operation

Input is a GTIN/barcode string. The adapter checks 8–14 digits and keeps it as text. The OFF client requests a documented v3 product-by-code resource. The operation returns `{ outcome, product, validation, warnings }` for a found/incomplete source response, or throws a typed `DataEngineError` subclass for not-found/upstream/network/invalid-response conditions. M3 decides how these map to its public HTTP response envelope.

## OCR operation — provisional

`mapOcrPayload(payload)` maps the example structure in `DATA_FLOW.md`. That structure was not supplied by M1 and is not yet the real M1 contract. Do not wire production calls until M1 provides a real sample and M1/M3/M6 approve the contract. The mapper preserves raw OCR text and only copies confidence if supplied in the 0–1 range.

## Merging

`mergeObservations(existing, incoming)` requires both canonical records; it rejects two distinct non-null GTINs. Equal observations combine provenance. Differing values create unresolved conflicts and do not silently select an OFF or OCR winner. M3/M6 must decide what user-facing resolution flow is appropriate.

## Stage 5 repositories

`createRepositories(db)` exposes `products`, `ingredients` and `sources` repositories. M3 should pass an already connected MongoDB `Db` instance. The Data Engine does not create a server, Express route, user account, or auth layer.

## Handover checklist

- M1 supplies and approves actual OCR JSON sample.
- M3 confirms module import path, routes, error envelope and calculation ownership.
- M6 approves canonical schema/version and conflict policy.
- M4 agrees how OFF attribution and missing/uncertain fields are presented.
- M5 runs tests and records executed evidence.
