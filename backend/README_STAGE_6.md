# Stage 6 — Ingredient Intelligence Retrieval Layer

This stage adds read-only lookup services and a USDA FoodData Central API client to the existing Data Engine. It does not modify product mapping, M3 scoring, OCR execution or the project's REST routes.

## New source files

- `src/data-engine/reference/reference_repository.js`
  - Loads the curated ingredient, nutrient composition, additive and dietary guideline JSON datasets.
  - Provides exact lookup by canonical IDs, exact-only ingredient/additive candidates, generic nutrient composition lookups and guideline filtering.
  - Reads the existing `ingredient_aliases.json` as legacy candidates only. Its older `ING-###` IDs are not assumed interchangeable with the expanded catalogue IDs.
  - Returns `unmatched`, `not_found` or `ambiguous` rather than guessing.
  - M3 remains responsible for deciding whether an ingredient candidate is the correct match.
- `src/data-engine/reference/reference_lookup.js`
  - Facade for ingredient, composition and dietary guideline lookups.
- `src/data-engine/reference/additive_lookup.js`
  - Facade for exact additive ID, INS and alias candidate lookups.
- `src/data-engine/reference/usda_client.js`
  - Implements USDA FoodData Central food search (`POST /foods/search`) and food details (`GET /food/{fdcId}`).
  - Reads `FDC_API_KEY` from the environment (or accepts an injected key in tests).
  - Defaults search to `Foundation` and `SR Legacy`, not branded product records.
  - Returns search matches as candidates only; it never automatically associates a USDA result with an ingredient.
  - Normalizes an FDC food-details response while preserving the FDC ID, data type, nutrient IDs/names/units/amounts, data-type-qualified basis, source URL and retrieval timestamp.
  - Handles missing API key, invalid IDs, timeouts, network failures, malformed responses, HTTP 429 and upstream failures.
- `src/data-engine/reference/index.js`
  - Composes the local lookup and USDA operations through `createIngredientIntelligence()`.
- `scripts/validate-ingredient-intelligence.js`
  - Checks dataset ID uniqueness, ingredient-to-composition/additive links and additive evidence references.
- `test/reference/*.test.js`
  - Unit tests with in-memory/mock API responses; no live network call.

## Environment configuration

Add this to the local, untracked `backend/.env`:

```dotenv
FDC_API_KEY=your_usda_data_gov_key
```

A one-line template is provided as `.env.ingredient-intelligence.example`. When the approved files are merged into the project, add the `FDC_API_KEY` line to the existing `backend/.env.example`; do not replace that file. Do not commit `.env`, paste the key into chat, include it in screenshots or hard-code it in source. The deployed backend must use its secret/environment configuration.

USDA documents API-key authentication on API requests, food search and food details endpoints, a default registered-key limit of 1,000 requests per hour per IP, rate-limit headers and HTTP 429 responses. FDC data is public domain under CC0 1.0; attribution to FoodData Central is requested. See:

- https://fdc.nal.usda.gov/api-guide/
- https://fdc.nal.usda.gov/data-documentation/
- https://fdc.nal.usda.gov/Foundation_Foods_Documentation/
- https://fdc.nal.usda.gov/download-datasets/

## Example usage

From the project repository's `backend/` folder:

```js
const { createIngredientIntelligence } = require('./src/data-engine/reference');

const intelligence = createIngredientIntelligence();

// Exact/local reference lookup. M3 still owns the final ingredient match decision.
const candidates = intelligence.findExactIngredientCandidates('oats');
const genericValues = intelligence.getNutrientComposition('oats', {
  provider: 'USDA_FDC',
  preparationState: 'raw'
});
const additive = intelligence.getAdditiveByInsNumber('211');
const sugarGuidance = intelligence.getDietaryGuidelines({
  nutrientOrTopic: 'free_sugars',
  authority: 'WHO'
});

// Live USDA lookup. Search candidates must be reviewed before selecting an FDC ID.
const search = await intelligence.searchUsdaFoods('oats');
// After reviewing the description, food data type and preparation state:
// const details = await intelligence.getUsdaFoodDetails(search.candidates[0].fdcId);
```

The repository default data path is `../../../../data-engineering` relative to `backend/src/data-engine/reference/`. A caller or tests may inject `dataDir` or in-memory `datasets`.

## Important interpretation rules

- `ingredient_reference.json` and `nutrient_composition.json` are curated local reference datasets, not product composition data.
- Generic composition never proves how much ingredient is present in a packaged product.
- Foundation Foods values are represented per 100 g edible portion; SR Legacy and FNDDS values use the more cautious `per_100g_source_food` basis label. Branded foods are excluded from the default search and require explicit opt-in.
- Search results are candidates only. Do not automatically select the first FDC result or link it to a canonical ingredient without review.
- USDA can return nutrient zeros with limit-of-quantification metadata. Preserve both fields if present; a returned zero must not automatically be interpreted as a proven absence. The client retains `amount` and `loq` separately when supplied.
- The current Stage 4 dataset has six historical SR28 transcriptions and 37 candidate records that were copied from secondary FDC index pages. This Stage 6 client does not automatically replace those values. They still require direct official FDC verification and review before approved use.
- Additive and guideline retrieval is from the local curated JSON references; no live FSSAI/JECFA/WHO API integration is claimed.
- No rating, health verdict, fuzzy matching, ingredient quantity estimation or regulatory-compliance decision is implemented by M2.

## Commands

From `backend/`:

```bash
node --test test/reference/*.test.js
node scripts/validate-ingredient-intelligence.js
```

A live USDA smoke test requires a real `FDC_API_KEY` and is intentionally separate from automated tests.
