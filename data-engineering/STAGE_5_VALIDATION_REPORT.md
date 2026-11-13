# Stage 5 — Validation Report

**Date:** 2026-11-13
**Schemas:** JSON Schema Draft 2020-12; Python jsonschema 4.26.0

## Results

| Check | Result |
|---|---:|
| Reference schema meta-validation | 4/4 passed |
| Ingredient reference records (Stage 4) | 40/40 passed |
| Generic nutrient composition records (Stage 4) | 43/43 passed |
| Additive reference records (Stage 5) | 15/15 passed |
| Dietary guideline records (Stage 5) | 9/9 passed |
| Unique additive IDs | 15/15 |
| Unique guideline IDs | 9/9 |
| FSSAI authorization evidence references | all resolve |
| JECFA evaluation evidence references | all resolve |
| FSSAI category rows in starter set | 11 |
| JSON files parsed | 8 |

## Schema adjustment

The additive schema is version **1.1.0** and adds the ADI status `not_limited`. JECFA distinguishes an evaluation stated as “NOT LIMITED” from “NOT SPECIFIED”. Both are retained separately and require a null numeric ADI; neither is converted to zero. Individual numeric ADIs use `numeric`; only source-defined grouped ADIs use `group_numeric` and require a group name.

## Dataset interpretation

- The starter catalogue contains 15 additive identities and 9 WHO dietary-guideline records.
- 9 additive records containing FSSAI category rows remain `needs_review` pending verification against original Gazette notifications and any later amendments.
- 6 records are marked `reviewed` for JECFA source information only; this does not constitute project approval or Indian regulatory authorization.
- Empty FSSAI authorization arrays mean no category row was curated in this starter set, not that an additive is prohibited.

## Limitations

- Schema validation confirms structure and internal evidence references, not legal validity or scientific review approval.
- FSSAI maximum levels are category-specific. The cited consolidated Appendix A is a ready-reference; original Gazette notifications prevail. Exact notes and current amendments must be checked before any compliance determination.
- JECFA group ADIs retain the group name/expression basis. ADIs are not concentrations in a product or exposure estimates.
- WHO dietary recommendations are scoped to the stated population and are whole-diet guidance, not product-specific limits.
- No OCR, external API, product scoring, or MongoDB integration was performed in Stage 5.
