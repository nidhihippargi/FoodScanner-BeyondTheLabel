# Data Flow — Barcode and OCR Inputs

**Project:** Food Scanner — Beyond the Label
**Stage:** 1 — Architecture & schemas
**Version:** 1.0.0 (proposed for review)

## 1. Flow overview

```text
                       React Native app (M4)
                                |
                        scan / OCR capture
                                |
                                v
                    M1 Vision output (barcode/OCR)
                                |
                                v
                       Express backend (M3)
                                |
                   +------------+------------+
                   |                         |
             Barcode provided          OCR payload provided
                   |                         |
                   v                         v
             OFF adapter               OCR adapter
                   |                         |
                   v                         |
           OFF product response              |
                   |                         |
                   +------------+------------+
                                |
                         Source field mapping
                                |
                      Canonical product record
                                |
                    Schema + cross-field validation
                                |
               +----------------+----------------+
               |                                 |
          No conflict                       Conflict found
               |                                 |
               v                                 v
       quality / status update          store candidates + conflict
               |                                 |
               +----------------+----------------+
                                |
                     canonical record to M3 logic
                                |
                  Stage 5 storage adapter (MongoDB)
                                |
                      M3 response to M4 UI
```

M4 is not intended to call OFF directly. M1 performs image capture, barcode detection and OCR. M3 orchestrates backend requests and calls the Data Engine module. The Data Engine maps source data; M3 interprets it.

## 2. Barcode path (proposed sequence)

1. M1 detects a barcode and supplies it to the backend using the request contract agreed with M3/M6. The barcode is a string so leading zeroes are retained.
2. M3 invokes the Data Engine with the barcode. The Data Engine does not scan the barcode image.
3. The Stage 2 OFF adapter makes a product lookup using the API version and request conventions verified from the official docs at that time.
4. The parser distinguishes a found product, not-found response, incomplete record, invalid response, API error and network/timeout failure.
5. The mapper translates supported source fields into the canonical product structure. Unknown or undocumented source fields are ignored.
6. Every mapped value receives a source record and field-level provenance reference.
7. The canonical record is schema-validated. If required facts are absent, the record remains partial; absent facts are not fabricated.
8. The Data Engine returns the canonical record and source/quality details to M3. M3 runs analysis and constructs the client response.

The exact OFF request path, API version, selected fields, User-Agent, timeout/retry policy and error envelope are Stage 2 deliverables, not fixed by this document.

## 3. OCR path (proposed input contract for M1 review)

No OCR payload example was present in the repository during the Stage 1 audit. The following is a proposed adapter input—not a claim about M1's implementation. M1 and M6 must confirm the actual shape before Stage 2/4 integration.

```json
{
  "requestId": "scan-request-001",
  "capturedAt": "2026-11-12T00:00:00Z",
  "barcode": null,
  "ingredients": {
    "rawText": "Exact extracted ingredient-list text",
    "language": "en",
    "confidence": 0.91
  },
  "nutrition": {
    "declaredBasis": "per_100g",
    "servingSizeText": "Per 3 chips",
    "items": [
      {
        "sourceLabel": "Total Sugars",
        "value": 12.4,
        "unit": "g",
        "basis": "per_100g",
        "rawText": "Total Sugars 12.4 g",
        "confidence": 0.88
      }
    ]
  },
  "imageReferences": []
}
```

### OCR contract rules

- `requestId` identifies the scan request; it is not the product record ID.
- `capturedAt` represents capture time, not retrieval/processing time.
- `barcode` may be absent/null if M1 did not detect one.
- Ingredient `rawText` preserves the OCR output as received. Do not silently correct spelling or punctuation in the raw field.
- `language` is optional; if present it should use a BCP 47 tag.
- Confidence values are optional numbers between 0 and 1. They must come from M1; Data Engine must not synthesize them.
- Each nutrition item preserves `sourceLabel`, raw OCR text, numeric value, printed unit, declared basis and confidence when supplied.
- M1 is responsible for image preprocessing and OCR. Data Engine is responsible only for adapting the agreed payload to the canonical product contract.
- A value with low/unknown OCR confidence can be marked `unverified`; it must remain available for user review rather than be silently discarded.

M1 must clarify whether it supplies bounding boxes, multiple candidate OCR strings, confidence per token or per field, normalized nutrient labels, and serving-size parsing. Stage 1 does not require those implementation details; the adapter should only map fields M1 agrees to supply.

## 4. Combining OFF and OCR observations

A product scan may contain both an OFF barcode result and OCR observations. These are two independent sources, not interchangeable truth values.

1. Store one `sourceRecords` entry for each retrieved source/scan input.
2. Map each field independently and attach provenance to each observation.
3. If only one valid value exists, use it with the corresponding status.
4. If values agree, retain the selected canonical value with provenance to all supporting observations, where possible.
5. If values disagree, keep all candidates in `conflicts`, set the affected field status to `conflicting`, and do not silently prefer OFF or OCR.
6. Any resolution policy (for example, user confirmation or source-specific precedence) requires M3/M6 approval and must be documented before implementation.

A corrected value entered by a user is a new observation with `sourceType: "user_correction"`; it must not erase the earlier OCR/OFF evidence.

## 5. Proposed internal module contract

These are module-level conceptual operations, not final REST endpoints:

| Operation | Input | Output | Owner |
|---|---|---|---|
| `lookupByBarcode` | GTIN/barcode string + request context | Canonical product record or typed lookup failure | Data Engine; called by M3 |
| `mapOcrPayload` | M1-approved OCR payload | Canonical product record fragment / merge candidate | Data Engine |
| `mergeObservations` | Existing canonical record + new source observation | Updated canonical record and conflict list | Data Engine; precedence approved by M3/M6 |
| `validateProductRecord` | Canonical product record | Validation result and structured issues | Data Engine |

M3 owns the outer Express routes, authentication and API response envelope unless M3/M6 explicitly agree to a different boundary. The Data Engine should not introduce duplicate public routes without approval.

## 6. Error and missing-data behaviour (contract-level)

| Condition | Data Engine behaviour |
|---|---|
| Barcode not in OFF | Return a typed not-found outcome; allow OCR path to continue if available |
| OFF record found but fields absent | Return partial record; mark missing fields explicitly |
| OFF response malformed | Do not map partial arbitrary data; return a typed invalid-source-response error |
| Network timeout / service unavailable | Return typed upstream/network error with retryability metadata; no fake product record |
| OCR field absent | Keep field missing; do not infer from nearby text |
| OCR confidence absent | Omit confidence; do not default to 1.0 |
| OCR text uncertain | Preserve raw text and mark unverified when M1's confidence/review rules support it |
| OFF and OCR conflict | Preserve candidates and flag conflict pending agreed resolution |
| Schema validation fails | Reject/quarantine the invalid canonical result and report the path/rule; do not pass a malformed record to M3 analysis |

Detailed executable error codes, retry counts and timeout values are Stage 2 implementation decisions.

## 7. Storage boundary

The data flow is designed independently of the database. MongoDB Atlas is the project's selected target, but collection structure, indexes, migrations and persistence code are Stage 5. Until then, modules exchange JSON-compatible objects that validate against the Stage 1 schemas.

## 8. Review checklist

- [ ] M1 confirms OCR payload fields and confidence semantics.
- [ ] M3 confirms Data Engine is an internal backend module and owns Express routes.
- [ ] M3 confirms who normalises serving size and which conversions the data layer may perform.
- [ ] M6 confirms the canonical product contract and response boundary.
- [ ] M3/M6 approve conflict handling and field status semantics.
- [ ] M5 reviews the example records and expected missing/conflict behaviour.
