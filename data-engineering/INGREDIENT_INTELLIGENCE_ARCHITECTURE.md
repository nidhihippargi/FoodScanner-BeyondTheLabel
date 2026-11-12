# Ingredient Intelligence — Architecture

**Project:** Food Scanner — Beyond the Label
**Owner:** Member 2 — Data Engine
**Stage:** 1 — Requirements and data architecture
**Version:** 1.0.0 (proposed)
**Status:** Proposal; M3/M6 approval required before integration

## 1. Purpose

The Ingredient Intelligence layer provides structured, source-backed reference information about food ingredients, generic nutrient composition, food additives and dietary guidance. It extends the existing Data Engine; it is not a separate application or a product-scoring engine.

The intended barcode-fallback flow is:
1. M1 extracts the printed ingredient list and nutrition declaration using OCR.
2. M3 identifies ingredient mentions and maps them to canonical ingredient IDs using approved matching rules.
3. M2 retrieves the relevant reference records and returns provenance.
4. M3 interprets the product's declared nutrition and ingredient insights using an approved scoring method.
5. M4 presents the result and communicates missing or uncertain information.

The reference layer enriches ingredient explanations. It must not invent ingredient quantities or calculate a finished product's nutrient composition from an ingredient list alone.

## 2. Existing assets to preserve

This design extends, and does not replace:
- `data-engineering/schemas/product.schema.json`: canonical product facts and declared product nutrition.
- `data-engineering/schemas/ingredient.schema.json`: existing ingredient alias/reference candidate contract.
- `data-engineering/ingredient_aliases.json` and `.csv`: 27 candidate alias records and evidence/review notes.
- `backend/src/data-engine/mapping/ocr_mapper.js`: OCR-to-canonical-product mapper.
- `backend/src/data-engine/cleaning/ingredient_cleaner.js`: basic text normalization; not an alias matcher.
- `backend/src/data-engine/cleaning/nutrient_mapper.js`: mapping of recognized nutrient labels.

No existing contract is silently changed by this design.

## 3. Ownership

### M2 — Data Engine
Owns reference-data schemas, curated records, versioning, evidence/provenance, source identifiers, validation, approved source adapters and read-only lookup/repository interfaces for already-identified canonical IDs.

### M3 — Backend analysis
Owns ingredient tokenization and matching from OCR text to canonical IDs, alias/fuzzy/semantic matching and ambiguity resolution, ingredient interpretation, serving logic, scoring criteria, thresholds, weighting and final product rating.

### M1 — OCR
Owns image capture and OCR execution, the actual OCR payload contract, confidence metadata where available, and extraction of both the ingredient list and nutrition facts panel.

### M4 — Frontend
Owns presentation of ingredient explanations, nutrition values, sources, uncertainty and the rating.

### M5 — Verification
Owns verification scenarios and test reporting.

### M6 — Architecture
Approves shared contracts, data semantics and cross-module integration boundaries.

## 4. Logical datasets

Keep four logically distinct datasets. During development they may be version-controlled JSON files; at runtime they may be separate MongoDB collections/repositories.

| Dataset | Purpose | Source families | Must not be confused with |
|---|---|---|---|
| Ingredient reference | Identity, description, functions, aliases, allergen context and sourced considerations | Reviewed official/scientific references | Product-specific nutrient quantities or a health score |
| Nutrient composition | Generic composition of a described food/ingredient | USDA FoodData Central; IFCT only subject to reuse permission; other approved tables | Quantity of that ingredient in a packaged product |
| Additive reference | Additive identity, function, jurisdiction-specific conditions/maximums and scientific ADI evaluations | FSSAI; WHO/JECFA | Actual additive concentration in a product or exposure estimate |
| Dietary guidelines | Nutrient/diet-level recommendations with population, jurisdiction and units | WHO and approved national guidance | An ingredient-specific universal daily limit |

Each factual claim must identify supporting evidence.

## 5. Data flow

### Barcode found
The existing Open Food Facts adapter maps product information into the canonical product schema. Declared product nutrient values remain product facts with OFF provenance. Ingredient Intelligence may enrich ingredient references separately; it must not overwrite product values.

### Barcode not found
1. M1 captures readable images of the ingredients panel and nutrition facts panel where present.
2. OCR extracts raw ingredient text and nutrient values with units and declared basis.
3. The existing OCR mapper stores observations with OCR provenance and an appropriate unverified status.
4. M3 identifies ingredient mentions and passes canonical IDs to M2.
5. M2 returns ingredient, generic composition, additive and guideline references where available.
6. M3 decides which facts are suitable for product analysis and rating.

If the nutrition panel is missing or unreadable, the system may show sourced ingredient descriptions, but it must not fabricate a quantitative product nutrition score.

## 6. Record groups

### Ingredient reference
Stable identity, canonical ID/name, aliases, family, functions, description, allergen reference, evidence-backed health considerations, linked composition records, linked additive records and review status.

### Nutrient composition
Source-specific generic nutrient measurements: provider, external food ID, food description, preparation state, basis (e.g. per 100 g edible portion), nutrient values/units, source version, retrieval date and reuse/licensing metadata. This is a source food measurement, not a recipe quantity.

### Additive reference
Canonical additive identity, INS number where applicable, synonyms, functions, food-category-specific regulatory records, maximum levels and conditions as stated by the jurisdictional source, separate JECFA evaluation/ADI records and evidence.

### Dietary guideline
Nutrient/diet-level recommendation with authority, jurisdiction, population, recommendation type, comparator, value/range, units, denominator/basis, conditions, dates and evidence.

ADI (mg/kg body weight/day), maximum additive level in food (e.g. mg/kg food) and dietary recommendation (e.g. g/day or percentage of energy) are different measures and must remain distinct.

## 7. Identifier strategy

- `ingredientId`, `nutrientCompositionId`, `additiveId` and `guidelineId` are stable application identifiers stored as strings.
- Preserve external IDs separately, such as USDA FDC IDs and INS numbers.
- Ingredient records may reference multiple generic composition records.
- Additive records may have multiple jurisdictional authorizations and multiple scientific evaluations over time.
- Relationships use IDs, not duplicated untraceable text.

## 8. Evidence and review

Evidence records should retain publisher/authority, source title, canonical URL or document ID, publication/effective date when available, access/retrieval date, jurisdiction/population scope, exact proposition supported and source version.

Review states are distinct:
- `draft`: created but not checked.
- `needs_review`: source or interpretation is incomplete/ambiguous.
- `reviewed`: source checked and record internally consistent.
- `approved`: designated project reviewer approved for project use.
- `retired`: superseded or no longer suitable.

A reviewed source is not automatically a project-approved rule. Keep `unknown`, `not_found` and `not_assessed` distinct from explicit negative findings.

## 9. Source acquisition and reuse controls

- Use official APIs where offered and permitted; secrets remain in environment variables and never in Git.
- Curate regulations from official publications; retain notification/compendium ID, jurisdiction, category, clause/table and effective date.
- Record source terms and reuse restrictions before importing or redistributing source data.
- IFCT is a valuable Indian reference, but do not embed or redistribute it until NIN permission for the intended electronic use is confirmed.
- Record API/source version and retrieval date. Cached copies must remain traceable to their source.
- Stage 2 will perform detailed current-source verification and terms review. This Stage 1 document does not claim that import or licensing permission has been secured.

## 10. Safety and quality rules

1. Missing values remain missing; never substitute zero.
2. Generic composition is never represented as the actual amount used in a packaged recipe.
3. OCR observations remain identifiable as OCR-derived and potentially unverified.
4. Never infer an additive's concentration from its presence or position in an ingredient list.
5. Additive exposure requires concentration, intake amount and appropriate body-weight context; an ADI alone is not product exposure.
6. FSSAI category permissions, JECFA ADIs and WHO dietary recommendations are distinct.
7. Do not return universal good/bad labels as scientific facts. Store bounded, cited statements.
8. A numerical product rating requires adequate product-level nutrient data and an approved M3 scoring contract.
9. Unmatched or ambiguous ingredients return explicit statuses; do not guess.
10. Do not make medical, disease, personal suitability or regulatory-compliance claims beyond the evidence and its scope.

## 11. Proposed implementation layout

```text
data-engineering/
  INGREDIENT_INTELLIGENCE_ARCHITECTURE.md
  INGREDIENT_REFERENCE_DATA_DICTIONARY.md
  INGREDIENT_LOOKUP_CONTRACT.md
  ingredient_reference.json                 # Stage 4
  nutrient_composition.json                 # Stage 4
  additive_reference.json                   # Stage 5
  dietary_guidelines.json                   # Stage 5
  schemas/
    ingredient-reference.schema.json
    nutrient-composition.schema.json
    additive-reference.schema.json
    dietary-guideline.schema.json

backend/src/data-engine/
  reference/
    reference_repository.js                 # Stage 6
    usda_client.js                          # Stage 6
    additive_lookup.js                      # Stage 6
```

The names are proposed. Runtime placement must be confirmed with M3/M6. Stage 1 creates only architecture, dictionary, schemas and lookup contract; it does not populate datasets or create runtime modules.

## 12. Stage dependencies

| Stage | Work | Gate |
|---|---|---|
| 1 | Requirements, architecture, dictionary, schemas and lookup contract | M3/M6 contract review |
| 2 | Verify authoritative source availability, currency, terms and reuse rights | Approved source register |
| 3 | Finalize schemas against source fields and storage needs | Schema review |
| 4 | Build ingredient and generic nutrient records | Evidence and licensing review |
| 5 | Build additive and dietary-guideline records | Regulatory/scientific review |
| 6 | Implement repositories and approved API adapters | API/configuration/security review |
| 7 | Integrate reference lookups with confirmed OCR flow | Actual M1 payload and M3 interface |
| 8 | Pass structured evidence to M3 scoring contract | M3/M6 scoring approval |
| 9 | Test, document, verify and hand over | M5 verification and team sign-off |

## 13. Open decisions

- M1 must confirm the actual OCR payload for ingredient text, nutrition values, units, basis and confidence.
- M3/M6 must confirm ingredient matching ownership, canonical identifier vocabulary and lookup interface.
- M3 must define rating behavior when nutrition data is missing.
- M6/project owner must approve source reuse/licensing, data retention and deployment choices.
- A qualified reviewer/project owner must review interpretations of FSSAI regulations and scientific safety references before they are presented as compliance or health conclusions.
