# Stage 4 — Expanded Ingredient and Nutrient Composition Dataset

**Date:** 2026-11-13
**Stage:** 4 of 9
**Status:** Dataset draft prepared; some composition records require official-source revalidation.

## 1. Deliverables

- `ingredient_reference.json` — 40 canonical generic ingredient/food reference entries.
- `nutrient_composition.json` — 43 generic nutrient composition records.
- `INGREDIENT_DATASET_COVERAGE.csv` — linked record coverage and review state.

## 2. Coverage

| Measure | Count |
|---|---:|
| Canonical ingredient/food entries | 40 |
| Generic composition records | 43 |
| Official historical USDA SR28 records transcribed from USDA PDF tables | 6 |
| Candidate records transcribed from secondary FDC index views | 37 |
| Ingredient entries with a composition reference | 40 |
| Ingredient health evaluations created in this stage | 0 |
| Allergen assessments created in this stage | 0 |

The catalogue includes grains/flours, pulses, nuts/seeds, fruits, vegetables, dairy foods, oils and sweeteners. Different preparation/processing states are kept as distinct composition records, sometimes linked to the same broad canonical ingredient (for example peanuts, brown rice and yoghurt).

The existing `ingredient_aliases.json` and `.csv` remain separate and are not duplicated here. Their current `ING-###` identifiers are not yet cross-mapped to these Stage 4 canonical IDs; any crosswalk and matching semantics must be agreed with M3/M6 during integration. The Data Engine does not introduce fuzzy matching in this stage.

## 3. Source provenance and review status

### Official historical USDA tables

Six records (amaranth, oats, barley flour, whole-wheat flour, white rice and brown rice) were transcribed from the USDA SR28 historical nutrient tables. SR28 is a historical source (revised May 2016), not the latest Foundation Foods data release. Source PDF: https://www.ars.usda.gov/ARSUserFiles/80400535/Data/SR/SR28/reports/sr28fg20.pdf . These are marked `reviewed` as transcriptions of the cited historical tables, not approved as current product-scoring reference values.

### Candidate USDA FDC records

The remaining 37 composition records are candidate transcriptions from secondary pages that identify the corresponding USDA FoodData Central record ID and data type. Those pages are linked in `source.sourceUri` for transparency. They are marked `needs_review` because they have not been fetched directly from USDA in this stage.

The USDA official download page currently lists Foundation Foods October 2026 (JSON/CSV), SR Legacy April 2018 and FNDDS 2021–2023 (October 2024). The October 2026 Foundation JSON archive is about 681 KB zipped / 9 MB unzipped. Stage 6 should validate these candidate records directly against the official October 2026 USDA API or download, then replace/update any values and record exact source nutrient IDs/fields. Official dataset page: https://fdc.nal.usda.gov/download-datasets/ . The USDA describes Foundation Foods as analytical data on individual samples and SR Legacy as a historical data source; do not blend the datasets without retaining the data type/version.

USDA FDC official dataset documentation: https://fdc.nal.usda.gov/data-documentation/ . USDA API guide: https://fdc.nal.usda.gov/api-guide/ . USDA download FAQs: https://fdc.nal.usda.gov/faq/ .

The secondary pages explicitly state that carbohydrate-by-difference includes fibre under the USDA method. It is stored as `carbohydrate_by_difference` and must not be relabelled as available carbohydrate. Secondary source pages include NutrientGraph records and one GetFoodFacts record; they are research aids only, not the production source of record. Values remain unapproved until Stage 6 direct verification.

## 4. Important limitations

- Generic composition describes the cited generic food (e.g. raw almonds or cooked soybeans), not the amount or composition of that ingredient in a particular packaged recipe.
- No ingredient mass/percentage is inferred from order of appearance on an ingredient label.
- No finished-product nutrition is calculated by summing generic ingredient composition.
- The source records are measured or compiled for different food descriptions and preparation states. They must not be treated as interchangeable.
- The `healthConsiderations` and `allergenInfo` arrays are intentionally empty in these Stage 4 records. Empty means not assessed in this dataset stage, not safe, healthy or allergen-free.
- This stage does not create an additive permissions dataset or WHO/JECFA/WHO guideline facts; those belong to Stage 5.
- No health classification or numerical product rating is created; M3 owns interpretation and scoring.

## 5. Validation

The Stage 4 JSON files were checked against the Stage 3 Draft 2020-12 schemas. Validation checks include:
- every ingredient reference validates against `ingredient-reference.schema.json`;
- every nutrient composition record validates against `nutrient-composition.schema.json`;
- all composition references from ingredient records resolve to a composition record;
- all composition records refer to an ingredient record;
- unique IDs and non-empty nutrient fields;
- numeric values retain units and a per-100-g basis.

See `STAGE_4_VALIDATION_REPORT.md` for the actual validation counts.

## 6. Next stage

Stage 5 will create the additive-reference and dietary-guideline records, with FSSAI food-category constraints, JECFA ADI status and WHO recommendation scope kept distinct. Do not move to Stage 5 until Stage 4 is reviewed and approved.
