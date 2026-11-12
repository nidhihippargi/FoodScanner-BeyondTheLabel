# Stage 3 — Reference Database Design

**Project:** Food Scanner — Beyond the Label
**Owner:** Member 2 — Data Engine
**Status:** Design deliverable; no data population or runtime code in this stage
**Schema version:** 1.0.0 (initial reference-record contracts)

## 1. Stage objective

Finalize the record structures and relationships for four independent reference datasets: ingredient profiles, generic nutrient composition, food additive reference and dietary guidelines. Align the schemas with the Stage 2 source register and define the lookup interface expected by M3.

## 2. Files delivered

- `schemas/ingredient-reference.schema.json`
- `schemas/nutrient-composition.schema.json`
- `schemas/additive-reference.schema.json`
- `schemas/dietary-guideline.schema.json`
- Updated `INGREDIENT_REFERENCE_DATA_DICTIONARY.md`
- Updated `INGREDIENT_LOOKUP_CONTRACT.md`
- This design and decision record.

## 3. Final design decisions

1. Four datasets remain separate because nutrient composition, additive authorization/ADI, and dietary recommendations have different meanings and units.
2. The existing `ingredient_aliases.json` remains the single source of alias strings. The new ingredient profile schema uses the same stable `ingredientId` and does not duplicate alias arrays.
3. One canonical ingredient can link to multiple source-specific composition records (different food forms, preparation states or source data types).
4. USDA source data type, external food ID, source description, release, preparation state, measurement denominator and nutrient units are preserved.
5. FSSAI authorizations are stored per Indian food category and regulatory source/version. JECFA ADI evaluations remain separate entries.
6. Dietary recommendations require an explicit population, jurisdiction, unit and basis.
7. Evidence identifiers are embedded in each record. Application validation must verify that every evidence reference resolves within its record.
8. No schema contains a product rating or a universal good/bad field.
9. M2 provides read-only reference data to M3; M3 owns ingredient matching, interpretation and scoring.

## 4. Data relationship overview

```text
Existing Alias Dataset --(ingredientId)--> Ingredient Profile
                                          |
                                          +--> 0..many Nutrient Composition Records
                                          |
                                          +--> 0..many related Additive Records

Additive Record --> 0..many FSSAI category authorizations
              --> 0..many JECFA evaluation/ADI records

Dietary Guideline Record (independent; keyed by topic + authority + jurisdiction + population)

Each factual record --> Evidence entries / source locators
```

## 5. Source-field alignment

| Source family | Schema fields preserving source context | Key limitation retained |
|---|---|---|
| USDA FoodData Central | Provider, data type, external FDC ID, source description, release, source URI, retrieval time, preparation state, basis, nutrient IDs/units | Search match is a candidate; human/approved matching required. Composition is not recipe quantity. |
| FSSAI | India jurisdiction, food category code/name, authorization status, maximum-level type/value/unit/basis, conditions, regulation/notification/table/clause and effective dates | Original Gazette notification prevails; missing curated row is not prohibition. |
| WHO/JECFA | Evaluation date/meeting, distinct ADI status and numeric range/unit, group scope, evidence | ADI is not additive concentration or consumer exposure. |
| WHO/national guidelines | Authority, jurisdiction, explicit population/life stage/age, operator, value/range, unit, basis, conditions and publication/validity dates | Not a per-ingredient limit unless source explicitly says so. |
| IFCT (permission-gated) | Provider, source record ID, description, basis, release and license status | Do not import/embed until NIN reuse permission is confirmed. |

## 6. Validation boundary

JSON Schema validates each record's structure, types, allowed values, measurement types and required fields. Stage 6 application validation must additionally verify cross-file references, duplicate identifiers, evidence ID links, category/date overlaps and consistency between ingredient-to-composition references.

## 7. Deliberately excluded from Stage 3

- No ingredient/additive/guideline records are populated.
- No USDA API client, FSSAI importer or JECFA/WHO scraper is implemented.
- No OCR mapper change is made.
- No alias matching algorithm is implemented.
- No scoring/rating formula is designed or implemented.
- No MongoDB migration or collection update is run.

## 8. Review gates

M3/M6 should review the schema vocabulary and internal lookup contract. M1 must confirm the actual OCR payload before Stage 7 integration. Source terms and permissions remain subject to the Stage 2 controls. Stage 3 is ready for review after schema validation.
