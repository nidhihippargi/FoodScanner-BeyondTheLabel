# Ingredient Intelligence — Data Dictionary

**Version:** 1.1.0 (Stage 3 finalized design proposal)
**Status:** Schema design; sample-data population is Stage 4/5
**Related schemas:** ingredient-reference, nutrient-composition, additive-reference and dietary-guideline

## 1. Shared conventions

- JSON field names use camelCase. Stable application IDs are lowercase strings matching `^[a-z0-9][a-z0-9._-]*$`.
- Schema version is `1.0.0` for the first data-record contract. Schema revisions before population do not change the existing canonical product schema.
- Preserve source names, IDs, units, preparation details and measurement bases.
- Missing is not zero. Unknown, unmatched, not assessed and not found are distinct states.
- Timestamps use ISO 8601 date-time strings with timezone; source publication/effective dates use `YYYY-MM-DD`.
- Dataset review state is separate from evidence source and quality.
- Every health, safety, regulatory or nutrition claim must have one or more evidence references.
- Application-level validation must verify that every evidence ID and relationship ID resolves to an existing record. JSON Schema alone cannot validate cross-file references.

## 2. Entity relationship model

| Relationship | Cardinality | Meaning |
|---|---|---|
| Ingredient profile → alias candidate record | 1 : 0..many | The existing `ingredient_aliases.json` and `ingredient.schema.json` remain the single source for aliases. Both use the same stable `ingredientId`; do not duplicate alias lists in the new ingredient profile. |
| Ingredient profile → nutrient composition | 1 : 0..many | One canonical ingredient may have multiple source food records, preparation states or forms. |
| Ingredient profile → additive profile | 0..many links | Only where an ingredient is itself a food additive or there is an explicitly reviewed relationship. Do not infer this from name similarity. |
| Ingredient/additive/guideline record → evidence | 1 : many or 0 : many while draft | Claims refer to evidence IDs in the same record. Reviewed/approved ingredient and additive records require evidence. |
| Additive → FSSAI authorization | 1 : 0..many | Each authorization is specific to India, a food category, regulatory source/version, conditions and effective dates. |
| Additive → JECFA evaluation | 1 : 0..many | Evaluations are versioned over time; ADI status/value stays separate from FSSAI permission. |
| Dietary guideline | independent reference entity | Guidance is keyed by topic, authority, jurisdiction and population. It is not intrinsically tied to one ingredient. |

## 3. Ingredient reference profile

Schema: `schemas/ingredient-reference.schema.json`

| Field | Meaning / rule |
|---|---|
| `ingredientId` | Stable canonical ID; must match the ID used by the existing alias reference dataset. |
| `canonicalName`, `displayName` | Preferred data name and user-facing display name. |
| `category` | Broad food family enum. It is an organizational category, not a health rating. |
| `functions[]` | Sourced technological or culinary roles; no unsourced inference. |
| `description` | Concise factual identity/context. |
| `healthConsiderations[]` | Bounded statements with topic, interpretation, population scope, conditions and `evidenceIds`. Not a good/bad label. |
| `allergenInfo[]` | Allergen ID and relationship (`contains`, `derived_from`, `may_contain_in_source_context`, `unknown`) plus evidence. A reference profile does not establish that a finished product is allergen-free. |
| `nutrientCompositionRefs[]` | IDs of source-specific generic composition records. |
| `additiveRefs[]` | IDs of related additive records where the identity relationship is reviewed. |
| `evidence[]` | Evidence metadata: source, publisher, source type, URL, document ID, jurisdiction, publication/effective dates, access date, locator, supported proposition and license status. |
| `reviewStatus` | `draft`, `needs_review`, `reviewed`, `approved`, `retired`. Reviewed/approved records require evidence. |
| `createdAt`, `updatedAt` | Record maintenance timestamps. |

**Alias ownership:** Alias strings remain in existing `ingredient_aliases.json`; that file is the single alias dataset. M3 owns tokenization and matching of OCR mentions to an `ingredientId`. The M2 reference repository receives the resolved ID.

## 4. Generic nutrient composition

Schema: `schemas/nutrient-composition.schema.json`

| Field | Meaning / rule |
|---|---|
| `nutrientCompositionId` | Stable ID for one source-specific composition record. |
| `ingredientId` | Link to canonical ingredient profile. |
| `source.provider` | `USDA_FDC`, `ICMR_IFCT` or `other`. IFCT is not importable until the applicable NIN permission is confirmed. |
| `source.externalFoodId` | Exact provider food ID, stored as text. |
| `source.description` | Exact provider food description; do not discard source wording. |
| `source.dataType` | USDA data type: Foundation Foods, FNDDS, Branded Foods, Experimental Foods, SR Legacy; `IFCT`, `other` or `not_applicable` for other providers. |
| `source.foodCategory`, `countryOrRegion` | Provider context where supplied. |
| `source.datasetRelease` | Exact release/version where available; do not guess. |
| `source.publishedDate`, `modifiedDate` | Source publication/update dates where available. |
| `source.sourceUri` | Canonical source-record link where available. |
| `source.retrievedAt` | Application retrieval timestamp. |
| `source.licenseStatus`, `licenseName` | Reuse/attribution/permission assessment. Unknown until reviewed. |
| `source.sampleCount` | Optional sample count when supplied by source; not inferred. |
| `basis.quantity`, `basis.unit`, `basis.description` | Exact denominator (e.g. 100 g edible portion); never assume if source does not establish it. |
| `basis.ediblePortionOnly` | Optional explicit indicator if the source provides it. |
| `preparationState`, `preparationDetails` | Raw/cooked/boiled/fried/baked/roasted/dried/frozen/processed/as-sold/etc. Keep source-defined form. |
| `nutrients` | Map from controlled internal nutrient key to name, source nutrient ID, numeric value, unit, value type and source field. Zero is allowed only when source reports zero. |
| `reviewStatus` | Suitability/review of the matched generic composition record, separate from source licence status. |

**Interpretation rule:** a generic nutrient record describes the source's food item and basis. It is not the quantity of that ingredient in a packaged recipe and must not be summed to produce finished-product nutrition without verified recipe quantities and an approved calculation.

## 5. Additive reference

Schema: `schemas/additive-reference.schema.json`

### Identity fields

`additiveId`, `canonicalName`, optional `insNumber`, optional `casNumber`, aliases and sourced `technologicalFunctions`.

### FSSAI authorization entries

Each entry contains:

- `jurisdiction`: India.
- `foodCategoryCode` and `foodCategoryName`: exact category context; do not apply to another category.
- `status`: `permitted`, `conditional`, `not_permitted`, `not_assessed`.
- `maximumLevel`: `numeric`, `quantum_satis`, `good_manufacturing_practice` or `other`, with value/unit/basis where applicable.
- `conditions`: exact relevant restrictions/notes.
- `regulationTitle`, `notificationId`, `tableOrClause`, `effectiveFrom`, `effectiveTo`.
- `evidenceIds`: supporting original notification/official regulation references.

A `not_permitted` entry requires explicit evidence for the exact category and time period. Absence of a curated row means `not_assessed`/`not_found`, not prohibition. A compendium is a navigation/consolidation aid; the original Gazette notification prevails.

### JECFA evaluation entries

Each entry contains meeting number/date, `adiStatus`, optional ADI bounds and unit, optional group scope, notes and `evidenceIds`.

ADI statuses: `numeric`, `temporary_numeric`, `group_numeric`, `not_specified`, `not_allocated`, `not_established`, `withdrawn`, `not_available`. Preserve the source's exact evaluation status. Numeric ADI uses `mg_per_kg_body_weight_per_day`. It is not an additive concentration or product exposure.

## 6. Dietary guideline

Schema: `schemas/dietary-guideline.schema.json`

| Field | Meaning / rule |
|---|---|
| `guidelineId` | Stable guideline identifier. |
| `nutrientOrTopic` | Nutrient/topic such as free sugars, sodium or saturated fat. |
| `authority`, `jurisdiction` | Issuing body and scope of applicability. |
| `population` | Explicit description, life stage, sex, optional min/max age and age unit, plus conditions. Never default to adults if scope is unspecified. |
| `recommendation.recommendationType` | Limit, target, minimum, adequate intake, range, qualitative guidance or other. |
| `recommendation.operator` | `less_than`, `at_most`, `at_least`, `range`, `qualitative`. |
| `recommendation.value` | Single numeric value for less-than/at-most/at-least operators. |
| `recommendation.lowerValue`, `upperValue` | Both numeric only for range operator. |
| `recommendation.unit` | Exact unit, such as `g/day`, `mg/day`, `% energy`, or `mg_per_kg_body_weight_per_day`. |
| `recommendation.basis` | Denominator and assumptions (e.g. total energy intake, body weight, per day). |
| `referenceEnergyKcal` | Optional reference energy intake only where the source supplies it. |
| `conditions` | Source conditions/caveats. |
| `source` | Title, publisher, URL, publication/access date, locator, version and proposition supported. |
| `validFrom`, `validTo` | Validity window where supported. |

A dietary guideline is population- and context-dependent. It is not an additive maximum or per-ingredient daily limit unless the source explicitly defines it that way.

## 7. Shared review and unknown states

| State | Meaning |
|---|---|
| `draft` | Record created; not checked. |
| `needs_review` | Identity/source/interpretation incomplete or ambiguous. |
| `reviewed` | Source and record internally checked. |
| `approved` | Explicit project approval for use. |
| `retired` | Superseded or withdrawn from use. |
| `unknown` | Fact or identity cannot be established. |
| `unmatched` | OCR mention has no approved canonical mapping. |
| `ambiguous` | Multiple plausible ingredient identities; M3 resolves. |
| `not_assessed` | No assessment has been made. |
| `not_found` | A defined query in a stated source/version returned no record. |

Schema enum review states do not replace API result statuses. Lookup response statuses are defined in `INGREDIENT_LOOKUP_CONTRACT.md`.

## 8. Referential validation beyond JSON Schema

JSON Schema validates the shape of each record. The Stage 6 application validators must additionally ensure:

1. Every `ingredientId` on a nutrient composition record resolves to an ingredient profile.
2. Every ingredient `nutrientCompositionRefs[]` resolves to an existing composition record and its `ingredientId` is consistent.
3. Every `additiveRefs[]`/`additiveId` link resolves to the correct additive identity.
4. Every `evidenceIds[]` entry resolves to an evidence item in that record.
5. No duplicate canonical IDs, external source ID collisions or duplicate alias mapping rows occur unless explicitly allowed.
6. Effective date ranges are valid and overlapping rules are flagged for review rather than silently resolved.
7. Units, denominators and population scopes are present before numeric guidance is consumed.

## 9. Indexing guidance for Stage 5

Proposed indexes, subject to storage design review:

- unique `ingredientId`;
- unique `nutrientCompositionId` and compound lookup `{ ingredientId, source.provider, source.externalFoodId }`;
- unique `additiveId`, plus lookup indexes on `insNumber` and normalized canonical name;
- unique `guidelineId`, plus query index `{ nutrientOrTopic, jurisdiction, population.lifeStage, reviewStatus }`;
- source/evidence IDs for traceability.

Do not add fuzzy text indexes as a substitute for M3's approved matching method.
