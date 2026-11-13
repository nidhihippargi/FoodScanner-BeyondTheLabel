# Ingredient Intelligence — Lookup Contract

**Version:** 1.1.0 (Stage 3 refined proposal)
**Status:** Internal module contract; M3/M6 approval required
**Owner:** Data Engine (M2) · **Consumer:** Backend analysis (M3)
**Not a public Express REST API.**

## 1. Purpose and boundary

M2 validates and serves source-backed reference records after M3 has identified canonical ingredient/additive IDs. M2 does not tokenize OCR text, select semantic matches, interpret the product as good/bad or calculate a product score.

M3 is responsible for converting ingredient mentions to canonical IDs and deciding which facts feed analysis. M2 returns records, evidence, review status and source metadata.

## 2. Proposed internal operations

### `getIngredientReference(ingredientId)`

Returns one ingredient profile by exact stable ID: name, category, functions, description, health considerations, allergen relationships, linked reference IDs, evidence and review status.

### `getNutrientComposition(ingredientId, options?)`

Returns a list of source-specific generic composition records. Optional filters: provider, data type, preparation state and basis. Each result retains the source food description/ID, release, preparation state, measured basis, nutrient values/units, licensing status and retrieval time. It does not provide a recipe quantity or estimate product nutrition.

### `getAdditiveReference(additiveId)`

Returns additive identity, INS/CAS identifiers where known, functions, FSSAI category-specific authorization entries, JECFA evaluation entries, evidence and review state.

### `getAdditiveByInsNumber(insNumber)`

Exact lookup by validated INS number. An unverified OCR string must not be treated as a confirmed INS identifier.

### `getDietaryGuidelines(query)`

Returns matching guidance records filtered by topic/nutrient, authority, jurisdiction, population and effective date. Where guidance is population-dependent, caller must supply or explicitly resolve that context. Do not silently default to adult/global guidance.

## 3. Result envelope

Illustrative single-record result:

```json
{
  "status": "found",
  "record": {
    "ingredientId": "example_ingredient",
    "canonicalName": "Example ingredient",
    "reviewStatus": "reviewed",
    "evidence": []
  },
  "meta": {
    "schemaVersion": "1.0.0",
    "datasetVersion": "1.0.0",
    "retrievedAt": "2026-11-13T00:00:00Z"
  },
  "warnings": []
}
```

This is a contract illustration, not a populated ingredient record. Multi-record queries return a list of independently sourced records; do not produce fabricated aggregates.

## 4. Result statuses

- `found`: exact record exists and can be returned.
- `not_found`: exact canonical ID/INS number was queried and no record exists in the dataset version.
- `unmatched`: M3 could not map an OCR phrase to a canonical ID; this is an M3 matching result, not an M2 fuzzy-match result.
- `ambiguous`: M3 found multiple plausible candidate identities; do not pick one automatically.
- `not_assessed`: no applicable source review has been recorded.
- `not_available`: provider/source could not supply the requested data.
- `stale`: record is outside an explicitly approved refresh policy; do not invent a freshness threshold in Stage 3.
- `retired`: record is retained for traceability but no longer current for use.

## 5. Separation of data types

- Product-declared OCR/OFF nutrition remains in the canonical product record with field-level provenance.
- Generic composition is a source measurement for a described food item and denominator.
- FSSAI maximum permitted level is jurisdiction/category-specific.
- JECFA ADI is a scientific evaluation expressed per body weight per day; it is not product concentration.
- WHO dietary guidance is topic/population/basis specific.
- Ingredient name/order does not provide recipe quantities, additive concentrations, exposure or total nutrient values.

## 6. Missing data and scoring

There is no `calculateHealthScore`, `rateProduct`, `isHealthy` or equivalent operation in M2.

M3 owns the score algorithm, input requirements, thresholds, weights, serving handling, versioning and insufficient-data behavior. A numeric nutritional rating needs adequate product-level nutrient information and an approved M3 method. If only ingredient text is available, M2 can return sourced ingredient insights but cannot manufacture a quantitative product nutrition score.

## 7. Security and data-use controls

- API keys remain in environment variables/secrets and never in repository files.
- Provider calls require bounded timeouts, rate-limit handling, safe retries and non-sensitive error messages when implemented.
- Persist only fields permitted by source terms and the project's retention policy.
- Cache/refresh behavior is not set until source terms and deployment are reviewed.
- Each returned record includes source/release and retrieval context where available.

## 8. M3/M6 approval checklist

- [ ] M1 confirms actual OCR ingredient/nutrition payload and confidence semantics.
- [ ] M3 confirms canonical IDs and ingredient matching ownership.
- [ ] M3 reviews operation names, filters and result status semantics.
- [ ] M3 defines its scoring contract and missing-nutrition behavior separately.
- [ ] M6 approves schema versioning and runtime module boundary.
- [ ] Project owner approves source reuse/licensing and retention policy.
