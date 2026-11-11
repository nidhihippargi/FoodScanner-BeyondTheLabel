# Product Data Dictionary

**Project:** Food Scanner — Beyond the Label
**Stage:** 1 — Architecture & schemas
**Canonical schema:** `schemas/product.schema.json`
**Version:** 1.0.0 (proposed for review)

## 1. Conventions

- Names are camelCase in the canonical JSON record.
- Identifiers and barcodes are strings, not numbers, so leading zeroes are preserved.
- Timestamps use ISO 8601 date-time strings with a timezone (`date-time`).
- A numeric value is never set to `0` to mean missing. The value is `null` and its status is `missing`.
- Important fields use a value/status/provenance wrapper. See `Field status` and `Provenance` below.
- Nutrient names in the canonical record are controlled, lower_snake_case keys. A source-specific name must be mapped explicitly; do not copy arbitrary source keys into business logic.

## 2. Field status

| Status | Meaning | Required behaviour |
|---|---|---|
| `available` | A value was obtained from a source and accepted as present | Value must not be null; record provenance |
| `missing` | No value was supplied by the available source(s) | Value must be null; never substitute zero |
| `unverified` | A value exists but has not been sufficiently checked (for example, OCR text awaiting review) | Preserve it, expose the uncertainty and source confidence if available |
| `conflicting` | Two or more sources provide incompatible values and no approved resolution has been applied | Preserve candidates in `conflicts`; do not silently choose one |

`sourceType` and `extractionMethod` describe where/how a value came from. They are not field statuses: an OCR value may be `available` or `unverified`, depending on whether it has been reviewed.

## 3. Top-level product record

| Field | Type | Required | Nullable | Unit / format | Description and rule |
|---|---|---:|---:|---|---|
| `schemaVersion` | string | Yes | No | Semantic version | Version of this canonical contract; currently `1.0.0` |
| `recordId` | string | Yes | No | Non-empty identifier | Stable application record ID. MongoDB `_id` mapping is deferred to Stage 5 |
| `identifiers` | object | Yes | No | — | Product identifiers; the GTIN wrapper may be missing |
| `productName` | string-field object | Yes | `value` yes | Text | Product name with status and provenance |
| `brand` | string-field object | Yes | `value` yes | Text | Brand text; preserve source text rather than splitting into taxonomy concepts in Stage 1 |
| `packageQuantity` | quantity-field object | Yes | `value`/`unit` yes | g, kg, ml, l, count or unknown | Original package-size text plus parsed quantity when the source supplies enough information; parsing rules are Stage 4 |
| `ingredients` | object | Yes | `rawText` yes | Text plus optional language tag | Original ingredient-list text; Data Engine does not run alias matching |
| `nutrition` | object | Yes | Nutrient values yes | Basis and nutrient units below | Declared basis, serving-size metadata and per-nutrient values |
| `images` | array | Yes | Empty array allowed | URI | Product image references only; image rights/attribution must be observed |
| `sourceRecords` | array | Yes | No | — | Source-level records referenced by field provenance; at least one source record |
| `conflicts` | array | Yes | Empty array allowed | — | Unresolved/resolved field conflicts; do not discard competing observations |
| `quality` | object | Yes | No | — | Record-level quality summary; it is not a health score |
| `createdAt` | string | Yes | No | ISO 8601 date-time | Record creation timestamp |
| `updatedAt` | string | Yes | No | ISO 8601 date-time | Last canonical record update timestamp |

## 4. Nested fields

### 4.1 `identifiers.gtin`

| Child | Type | Required | Nullable | Rule |
|---|---|---:|---:|---|
| `value` | string | Yes | Yes | Digits stored as text; when present, 8–14 digits |
| `status` | enum | Yes | No | `available`, `missing`, `unverified`, `conflicting` |
| `provenance` | array | Yes | No | Entries reference `sourceRecords.sourceId` |

Do not convert a barcode to an integer. A barcode is an identifier, not a quantity.

### 4.2 Reusable string field (`productName`, `brand`)

| Child | Type | Required | Nullable | Rule |
|---|---|---:|---:|---|
| `value` | string | Yes | Yes | Original text or null when missing |
| `status` | enum | Yes | No | Field status table above |
| `provenance` | array | Yes | No | One or more observations when known |

### 4.3 `packageQuantity`

| Child | Type | Required | Nullable | Rule |
|---|---|---:|---:|---|
| `rawText` | string | Yes | Yes | Exact package quantity text as captured |
| `value` | number | Yes | Yes | Parsed numeric quantity, non-negative |
| `unit` | enum | Yes | No | `g`, `kg`, `ml`, `l`, `count`, `unknown` |
| `status` | enum | Yes | No | Field status |
| `provenance` | array | Yes | No | Source observations |

A parser must not guess a unit. If the printed quantity cannot be parsed reliably, retain `rawText`, use null for `value`, and mark it `unverified` or `missing` as appropriate.

### 4.4 `ingredients`

| Child | Type | Required | Nullable | Rule |
|---|---|---:|---:|---|
| `rawText` | string | Yes | Yes | Original full ingredient text; do not rewrite or normalise away the source |
| `language` | string | Yes | Yes | Optional BCP 47 language tag where supplied/known |
| `status` | enum | Yes | No | Field status |
| `provenance` | array | Yes | No | Source observations, including OCR confidence when available |

The Stage 1 contract deliberately stores the text. Ingredient tokenisation, alias matching and conclusions about added sugar belong to M3 and later stages.

### 4.5 `nutrition`

| Child | Type | Required | Nullable | Rule |
|---|---|---:|---:|---|
| `declaredBasis` | enum | Yes | No | `per_100g`, `per_100ml`, `per_serving`, `as_sold`, `unknown` |
| `servingSize.rawText` | string | Yes | Yes | Original package serving-size wording |
| `servingSize.value` | number | Yes | Yes | Parsed non-negative numeric amount |
| `servingSize.unit` | string | Yes | Yes | Unit exactly as interpreted; examples `g`, `ml`, `piece` |
| `servingSize.status` | enum | Yes | No | Field status |
| `servingSize.provenance` | array | Yes | No | Source observations |
| `nutrients` | object | Yes | Empty object allowed | Map of canonical nutrient key to nutrient datum |

Each nutrient datum contains:

| Child | Type | Required | Nullable | Rule |
|---|---|---:|---:|---|
| `originalValue.value` | number | Yes | Yes | Numeric value as supplied/entered by the source |
| `originalValue.unit` | string | Yes | Yes | Original unit, such as `g`, `mg`, `kJ`, `kcal` |
| `originalValue.basis` | enum | Yes | No | `per_100g`, `per_100ml`, `per_serving`, `as_sold`, `unknown` |
| `standardizedValues` | array | Yes | Empty array allowed | Zero or more source-provided or deterministically converted representations; each item contains `value`, `unit` and `basis` (`per_100g`, `per_100ml`, `per_serving`) |
| `status` | enum | Yes | No | Field status |
| `provenance` | array | Yes | No | Source and any documented transformation |

Initial canonical nutrient keys (not every product will have every key): `energy_kj`, `energy_kcal`, `fat`, `saturated_fat`, `carbohydrates`, `sugars`, `added_sugars`, `fiber`, `protein`, `salt`, `sodium`. A key is included only when the source supplies a corresponding datum. The schema allows future keys, but each new mapping must be documented. `added_sugars` must not be derived from `sugars` or ingredient names.

**Important distinction:** raw source values and standardized per-100g/per-100ml values are separately represented. Do not calculate a per-100g value from serving size in this stage; ownership of serving-size calculations must be agreed with M3. A source-provided per-100g value can be mapped as source data with its own provenance.

### 4.6 `images`

Each image has `url`, `kind` (`front`, `ingredients`, `nutrition`, `other`), and `sourceId`. Do not copy an image URL without its source context. Stage 2 must confirm which OFF image fields are stable for the selected API version.

### 4.7 `sourceRecords`

| Field | Type | Required | Nullable | Rule |
|---|---|---:|---:|---|
| `sourceId` | string | Yes | No | Unique within this product record |
| `sourceType` | enum | Yes | No | `open_food_facts`, `ocr`, `user_correction`, `manual_entry`, `other` |
| `extractionMethod` | enum | Yes | No | `barcode_lookup`, `ocr_extraction`, `manual_entry`, `api_import`, `other` |
| `retrievedAt` | date-time | Yes | No | When the application obtained the source data |
| `sourceUpdatedAt` | date-time | No | Yes | Source update timestamp, only when supplied |
| `externalRecordId` | string | No | Yes | Source-specific product ID/barcode |
| `sourceUri` | URI | No | Yes | Source record URI, when available |

A field provenance entry contains `sourceId` (reference to this array), `extractionMethod`, optional `sourceField`, optional `observedAt`, optional confidence 0–1, and optional transformation notes. If M1 does not supply confidence, omit it; do not invent it.

### 4.8 `conflicts`

A conflict records `fieldPath`, at least two `candidates` (each with `sourceId`, JSON value and optional observation time), `resolutionStatus` (`unresolved` or `resolved`), and optional resolution note. Resolved conflicts remain in the record as audit history. Conflict precedence is not defined in Stage 1 and requires M3/M6 approval.

### 4.9 `quality`

`recordStatus` is one of `complete`, `partial`, `insufficient`, or `conflicted`. `missingFields` and `unverifiedFields` are canonical JSON paths. This status describes availability/reliability of product data, not whether a product is healthy or unhealthy. Numeric completeness thresholds are intentionally not defined yet.

## 5. Canonical units and conversions

Stage 1 names standard units but does not implement a conversion engine. Proposed standard units for common nutrition data are `g` for mass nutrients, `mg` for sodium when that is the agreed canonical representation, `kJ` for energy in kJ and `kcal` for energy in kcal. Preserve the input unit regardless of the final standard unit. Stage 4 must document every allowed conversion, rounding policy and test case before implementation. Do not convert between salt and sodium without an explicitly approved scientific conversion rule.

## 6. Example record (illustrative only)

This example is abbreviated to explain shape. It is not a real product and does not assert any nutrition value.

```json
{
  "schemaVersion": "1.0.0",
  "recordId": "example-record-001",
  "identifiers": {
    "gtin": {
      "value": "8900000000000",
      "status": "available",
      "provenance": [{"sourceId": "off-lookup-1", "extractionMethod": "barcode_lookup", "sourceField": "code"}]
    }
  },
  "productName": {"value": "Example product", "status": "available", "provenance": [{"sourceId": "off-lookup-1", "extractionMethod": "barcode_lookup", "sourceField": "product.product_name"}]},
  "brand": {"value": null, "status": "missing", "provenance": []},
  "packageQuantity": {"rawText": null, "value": null, "unit": "unknown", "status": "missing", "provenance": []},
  "ingredients": {"rawText": null, "language": null, "status": "missing", "provenance": []},
  "nutrition": {
    "declaredBasis": "unknown",
    "servingSize": {"rawText": null, "value": null, "unit": null, "status": "missing", "provenance": []},
    "nutrients": {}
  },
  "images": [],
  "sourceRecords": [{"sourceId": "off-lookup-1", "sourceType": "open_food_facts", "extractionMethod": "barcode_lookup", "retrievedAt": "2026-11-12T00:00:00Z", "externalRecordId": "8900000000000"}],
  "conflicts": [],
  "quality": {"recordStatus": "partial", "missingFields": ["/brand", "/ingredients/rawText", "/nutrition/servingSize"], "unverifiedFields": []},
  "createdAt": "2026-11-12T00:00:00Z",
  "updatedAt": "2026-11-12T00:00:00Z"
}
```

The example's `retrievedAt` is illustrative; a real implementation must use the actual retrieval time. The example should be run through the schema once the Stage 1 schema is approved and tests are added in Stage 6.
