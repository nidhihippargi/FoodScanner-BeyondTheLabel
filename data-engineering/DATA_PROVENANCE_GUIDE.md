# Data Provenance Guide

## Why provenance exists

A product value may come from an OFF record, OCR extraction, user correction or manual entry. Provenance lets downstream modules explain which observation supplied a value and avoid treating uncertain or conflicting observations as verified facts.

## Source records

`sourceRecords[]` stores one observation source with `sourceId`, `sourceType`, `extractionMethod`, `retrievedAt`, optional `sourceUpdatedAt`, optional `externalRecordId` and optional `sourceUri`.

## Field provenance

A field's `provenance[]` points to a `sourceRecords[].sourceId` and can include `sourceField`, `observedAt`, OCR/source confidence and transformation notes. Confidence is only copied when the upstream source supplies it; do not invent a default confidence.

## Status meanings

- `available`: value exists and is accepted as present.
- `missing`: no value exists; value remains null.
- `unverified`: value exists but needs review.
- `conflicting`: at least two incompatible observations remain unresolved.

A source type is not a status. OCR observations may be available or unverified depending on evidence and review.

## Transformation history

Keep the original text/value/unit. A standardised representation is additional information with explicit unit and basis. Transformation notes should identify the deterministic rule. The system does not silently replace original values.

## Conflict history

A conflict stores field path, candidate source IDs/values and resolution state. If later resolved, retain the conflict entry and the resolution note; do not erase original candidates. Source precedence is not defined in this deliverable and requires M3/M6 approval.

## Data freshness

Use `retrievedAt` for when this application obtained a response and `sourceUpdatedAt` only when the source supplies a timestamp. Do not substitute scan capture time for retrieval time.
