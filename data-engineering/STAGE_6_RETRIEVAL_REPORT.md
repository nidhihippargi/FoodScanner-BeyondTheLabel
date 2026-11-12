# Stage 6 — Retrieval Implementation Report

**Stage:** 6 of 9
**Date:** 2026-11-13
**Status:** Local retrieval implementation and mock tests completed; external live API verification pending.

## 1. Deliverables

### Runtime code

- `backend/src/data-engine/reference/reference_repository.js`
- `backend/src/data-engine/reference/reference_lookup.js`
- `backend/src/data-engine/reference/additive_lookup.js`
- `backend/src/data-engine/reference/usda_client.js`
- `backend/src/data-engine/reference/index.js`

### Tests and tooling

- `backend/test/reference/reference_repository.test.js`
- `backend/test/reference/usda_client.test.js`
- `backend/scripts/validate-ingredient-intelligence.js`
- `backend/README_STAGE_6.md`
- `backend/.env.ingredient-intelligence.example`

## 2. Implemented operations

| Operation | Behavior |
|---|---|
| `getIngredientReference(ingredientId)` | Exact lookup by canonical ingredient ID |
| `findExactIngredientCandidates(name)` | Exact text candidates only; returns ambiguity and requires M3 confirmation |
| `getNutrientComposition(ingredientId, options)` | Retrieves source-specific generic compositions, with optional provider/preparation filters |
| `getAdditiveReference(additiveId)` | Exact additive ID lookup |
| `getAdditiveByInsNumber(insNumber)` | Exact INS-number lookup |
| `findExactAdditiveCandidates(query)` | Exact name/alias/ID/INS candidates; no fuzzy matching |
| `getDietaryGuidelines(query)` | Filters by nutrient/topic, authority, jurisdiction, population life stage and validity date |
| `searchUsdaFoods(query, options)` | USDA FDC search; returns candidate records only |
| `getUsdaFoodDetails(fdcId)` | USDA detail retrieval and normalized source record |

## 3. Data-source behavior

The local repository loads the four curated JSON datasets. The pre-existing `ingredient_aliases.json` is optional in this standalone package because that file remains in the existing main project repository; when installed into the full project it is read as a legacy alias candidate list. These IDs are not silently mapped to the expanded catalogue. An exact canonical-name cross-reference is attached only if it exists, and M3 must confirm all ingredient matching.

FSSAI, JECFA and WHO guidelines are served from the locally curated reference records. This stage does not claim live APIs for those sources.

The USDA API client uses the official FDC API guide and supports Food Search and Food Details. Default search filters are `Foundation` and `SR Legacy` to avoid matching a branded finished product when looking for generic ingredient composition. The client supports `Survey (FNDDS)` or `Branded` only when explicitly requested. `Foundation` basis is recorded as per 100 g edible portion; SR Legacy and Survey (FNDDS) are labeled per 100 g source food, not silently equated with Foundation. The API result retains the data type and source FDC ID.

## 4. USDA configuration and limits

Set `FDC_API_KEY` in a local untracked `backend/.env`. The key is included in requests as documented by USDA and is never printed in error messages. The code captures `X-RateLimit-Limit` and `X-RateLimit-Remaining`, exposes `Retry-After` for 429 responses and marks 429/5xx/network/timeout conditions appropriately retryable.

The official API guide describes:

- `POST /foods/search` and `GET /food/{fdcId}` as the primary search/detail operations;
- a default registered-key limit of 1,000 requests/hour per IP and HTTP 429 when exceeded;
- CC0 1.0 public-domain licensing, with USDA requesting source acknowledgement.

Sources:
- USDA API Guide: https://fdc.nal.usda.gov/api-guide/ (accessed 2026-11-13)
- USDA Data Type Documentation: https://fdc.nal.usda.gov/data-documentation/ (accessed 2026-11-13)
- USDA Foundation Foods Documentation: https://fdc.nal.usda.gov/Foundation_Foods_Documentation/ (accessed 2026-11-13)
- USDA Download Datasets: https://fdc.nal.usda.gov/download-datasets/ (accessed 2026-11-13)

The USDA download page lists Foundation Foods October 2026, SR Legacy April 2018 and FNDDS 2021–2023 (October 2024) on the access date. Foundation Foods documentation states nutrient values are reported on a 100 g edible-portion basis and notes that not every nutrient is analyzed for every food.

## 5. Validation results

- 20 Node built-in tests passed; 0 failed, 0 skipped.
- Mocked USDA search and details calls passed.
- Missing API key, invalid identifier, timeout, network failure, HTTP 404, 429 and 503 handling passed using mocks.
- Ingredient, additive and dietary guideline lookup tests passed.
- Dataset cross-reference validation passed: 40 ingredient records, 43 generic composition records, 15 additive records and 9 dietary guidelines; all ingredient composition/additive references and additive evidence references resolve.
- JavaScript syntax checks passed for all new runtime, test and validation files.
- Tests did not call USDA over the live network.

## 6. Known limitations and follow-up

1. **Live USDA check not run:** no API key was configured in this package. The live API client is implemented, but network availability/authentication has not been demonstrated.
2. **Stage 4 nutrient review remains open:** six records are historical SR28 transcriptions; 37 candidate records were transcribed from secondary FDC index pages. The new API client does not silently overwrite those values. Each candidate still needs direct official FDC review and data-type/basis matching.
3. **Alias crosswalk remains pending:** existing `ING-###` alias IDs are not yet mapped to the expanded ingredient IDs. M3/M6 must approve the canonical mapping policy.
4. **Additive/guideline sources:** local lookup only; source refresh/revalidation policy remains to be set.
5. **No scoring:** this module returns factual records and provenance only. M3 owns scoring and interpretation.
6. **No OCR integration:** actual M1 payload and M3 handoff remain unconfirmed. Stage 7 handles the integration contract.
7. **No GitHub changes:** all files are in the cumulative working package only. Nothing is installed in the local repository, committed or pushed.

## 7. Stage 6 exit statement

The local retrieval interfaces and USDA API client are implemented and unit-tested with mocked responses. This satisfies the code-level retrieval deliverable. The live FDC call, direct verification of the 37 candidate composition values, and cross-module integration remain outstanding and must not be represented as completed.
