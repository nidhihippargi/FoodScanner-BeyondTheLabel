# Field Mapping — Source Data to Canonical Product

**Project:** Food Scanner — Beyond the Label
**Stage:** 1 — Architecture & schemas
**Version:** 1.0.0 (proposed for review)

## 1. Mapping rules

1. Map only documented source fields that are present in the response.
2. Preserve source payload values and units in the canonical `originalValue` / `rawText` fields.
3. Attach provenance to every mapped field, including the source field path and source record ID.
4. Do not infer missing values, convert a null to zero, or use an unverified source property.
5. Ignore unknown OFF response fields so additive source-schema changes do not break the adapter.
6. Treat the paths below as mapping candidates, not as a committed API-version contract. OFF's current documentation identifies v3.6 as current and v2 as deprecated; the exact fields and structures used by the Stage 2 adapter must be rechecked against the selected API version immediately before implementation.

## 2. OFF product field candidates

The following familiar paths are useful starting points for field mapping. The official OFF v2 product lookup example documents a product object with fields including `product_name`, `brands`, `code`, and `nutriments`; current OFF schemas are versioned and the v3 product/nutrition structures have changed over time. Do not assume every path below has identical shape in v3.6.

| OFF response candidate | Canonical field | Mapping rule | Notes / validation |
|---|---|---|---|
| top-level `code` (and/or `product._id` if confirmed for chosen API) | `identifiers.gtin.value` | Convert to string without numeric parsing | Preserve leading zeroes; validate GTIN form; record exact source path |
| `product.product_name` (localised variants only if explicitly selected) | `productName.value` | Preserve selected source text as-is | Do not merge translations into one string |
| `product.brands` | `brand.value` | Preserve source text | Do not assume comma/semicolon splitting is universally correct |
| `product.quantity` | `packageQuantity.rawText` | Preserve original packaging quantity text | Numeric parsing deferred to Stage 4 |
| `product.ingredients_text` or version-specific equivalent | `ingredients.rawText` | Preserve full source string | Do not run sugar alias matching here |
| ingredient language field, if documented for selected version | `ingredients.language` | Map language code when present | Do not guess language if absent |
| `product.serving_size` | `nutrition.servingSize.rawText` | Preserve entered wording | Parsing is Stage 4 and may remain unverified |
| `product.nutrition_data_per` or version-specific basis field | `nutrition.declaredBasis` | Translate only known values to canonical basis | If unknown/unavailable, use `unknown`; do not assume per 100 g |
| nutrient raw value, e.g. `product.nutriments.<nutrient>_value` | `nutrition.nutrients.<key>.originalValue.value` | Map numeric value when present | Verify nutrient key and field shape against selected API schema |
| nutrient input unit, e.g. `product.nutriments.<nutrient>_unit` | `nutrition.nutrients.<key>.originalValue.unit` | Preserve the supplied unit | Do not infer from magnitude |
| per-100g value, e.g. `product.nutriments.<nutrient>_100g` | `nutrition.nutrients.<key>.standardizedValues[]` with `basis: "per_100g"` | Map only where the selected API schema identifies the basis/value as per 100 g | Attach provenance to exact source path; not an app-side calculation |
| per-100ml value, if supplied by the selected API schema | `nutrition.nutrients.<key>.standardizedValues[]` with `basis: "per_100ml"` | Map only where the source identifies the basis | Do not map a per-100g value as per-100ml |
| per-serving value, e.g. `product.nutriments.<nutrient>_serving` in applicable schemas | `nutrition.nutrients.<key>.standardizedValues[]` with `basis: "per_serving"` | Preserve source-provided per-serving value as a separate representation | Do not calculate a per-serving value in this layer |
| product image URL / selected image structure | `images[]` | Map only a documented selected image URL and image kind | OFF v3 image structure changed; confirm exact v3.6 path in Stage 2 |
| OFF source record identifier / source timestamp when available | `sourceRecords[]` | Map to `externalRecordId` / `sourceUpdatedAt` | Do not invent source update time if absent |

### Nutrient-key mapping

| OFF nutrient concept | Canonical key | Caution |
|---|---|---|
| `energy-kj` | `energy_kj` | Preserve kJ unit |
| `energy-kcal` | `energy_kcal` | Preserve kcal unit; do not combine with kJ without explicit rule |
| `fat` | `fat` | Map only if present |
| `saturated-fat` | `saturated_fat` | Map only if present |
| `carbohydrates` | `carbohydrates` | Do not rename to sugars |
| `sugars` | `sugars` | Total sugars nutrition data, not an ingredient alias match |
| explicit added-sugars nutrient, if supplied by the selected source schema | `added_sugars` | Never derive from total sugars or ingredient text |
| `fiber` / source equivalent | `fiber` | Confirm source taxonomy spelling |
| `proteins` / source equivalent | `protein` | Confirm source naming and unit |
| `salt` | `salt` | Do not convert to sodium without an approved rule |
| `sodium` | `sodium` | Keep separate from salt |

OFF's nutrition documentation distinguishes entered values and units (`_value`, `_unit`) from per-100g/per-serving values. The adapter must retain that distinction instead of flattening these into one unexplained number.

## 3. OCR mapping proposal (awaiting M1 confirmation)

No real M1 output JSON was found in the repository at audit time. The mappings below target the proposed OCR input contract in `DATA_FLOW.md`; adjust them after M1 supplies an actual example.

| Proposed OCR input | Canonical field | Mapping rule |
|---|---|---|
| `requestId` | `sourceRecords[].externalRecordId` or scan context | Keep scan/request ID distinct from product record ID |
| `capturedAt` | provenance `observedAt` / source metadata | Preserve capture time; `retrievedAt` is when backend receives it |
| `barcode` | `identifiers.gtin.value` | Only if M1 explicitly returns a detected barcode; string only |
| `ingredients.rawText` | `ingredients.rawText` | Preserve exact OCR output, including uncertainty |
| `ingredients.language` | `ingredients.language` | Map only when supplied or reliably identified by M1 |
| `ingredients.confidence` | ingredient field provenance `confidence` | Pass through 0–1; do not invent a default |
| `nutrition.declaredBasis` | `nutrition.declaredBasis` | Map known value; unknown remains `unknown` |
| `nutrition.servingSizeText` | `nutrition.servingSize.rawText` | Preserve exact OCR text; parsing deferred |
| `nutrition.items[].sourceLabel` | Nutrient mapping lookup | Map only through an approved source-label dictionary; keep original label in transformation notes/fixture |
| `nutrition.items[].value` | `nutrients.<key>.originalValue.value` | Numeric only when M1 parsed a value; preserve raw text too |
| `nutrition.items[].unit` | `nutrients.<key>.originalValue.unit` | Preserve printed/interpreted unit supplied by M1 |
| `nutrition.items[].basis` | `nutrients.<key>.originalValue.basis` | Do not assume basis from the nutrition table layout |
| `nutrition.items[].rawText` | provenance / observation notes | Preserve original extracted line where available |
| `nutrition.items[].confidence` | nutrient provenance `confidence` | Pass through only if M1 supplies it |
| `imageReferences[]` | `images[]` only if reference is durable/retrievable | Store a reference, not base64 image contents in the product record |

## 4. Canonical nutrient vocabulary

The initial product schema recognises these canonical keys: `energy_kj`, `energy_kcal`, `fat`, `saturated_fat`, `carbohydrates`, `sugars`, `added_sugars`, `fiber`, `protein`, `salt`, `sodium`.

The vocabulary is a data contract, not an analysis rule. The following concepts must remain distinct:

- Ingredient string recognition (M3 alias matching).
- Interpretation of whether a listed ingredient represents added sugar (M3 rule, based on approved evidence).
- Total sugars reported in the nutrition panel (`sugars`).
- Added sugars reported explicitly by a source (`added_sugars`) if available.
- Any health/risk classification (outside the Data Engine's Stage 1 contract).

## 5. Provenance mapping

Every source record receives a stable `sourceId`. Each mapped field's `provenance[]` points to that `sourceId` and records:

- `extractionMethod` (`barcode_lookup`, `ocr_extraction`, `manual_entry`, `api_import` or `other`).
- `sourceField` (exact OFF response path or OCR payload path).
- `observedAt` when known.
- `confidence` only when supplied by OCR/source.
- `transformationNotes` when a deterministic, documented transformation occurred.

The application must validate that every provenance `sourceId` resolves to a `sourceRecords[].sourceId`. JSON Schema validates local structure; this cross-reference is an application-level rule for Stage 2/4/6.

## 6. OFF documentation and verification note

Official documentation reviewed on **2026-11-12**:

- API overview: https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/ — currently documents v3.6 as recommended and v2 as deprecated; includes rate limits and User-Agent guidance.
- Product schema change log: https://openfoodfacts.github.io/openfoodfacts-server/api/ref-api-and-product-schema-change-log/ — records breaking schema changes, including changes to tags, images, ingredients and nutrition structures.
- Nutrition data explanation: https://openfoodfacts.github.io/documentation/docs/Product-Opener/dev/explain-nutrition-data/ — explains entered values/units and per-100g/per-serving values.
- Product-by-barcode v2 reference (for historical/contextual field examples only): https://openfoodfacts.github.io/documentation/docs/Product-Opener/v2/products/get-product-by-code/.

**Stage 2 gate:** choose the API version and confirm exact endpoint, barcode normalization, response success/not-found shape, requested field selection, nutrient names, image fields, User-Agent, rate limits, license/attribution and error/retry behaviour using official docs. Do not implement against the candidate paths in this file without that verification.
