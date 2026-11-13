# Stage 5 Package — Additive Reference and Dietary Guidelines

This stage adds the additive reference and WHO dietary guideline starter datasets. It also advances the additive schema to version 1.1.0 and adds a distinct `not_limited` JECFA ADI status to preserve official terminology.

Files added/updated under `data-engineering/`:
- `additive_reference.json` (15 records)
- `dietary_guidelines.json` (9 records)
- `STAGE_5_ADDITIVE_AND_GUIDELINE_SOURCE_NOTES.md`
- `STAGE_5_ADDITIVE_COVERAGE.csv`
- `STAGE_5_GUIDELINE_COVERAGE.csv`
- `STAGE_5_VALIDATION_REPORT.md`
- `schemas/additive-reference.schema.json` (updated `not_limited` status)

FSSAI authorization rows are food-category specific. Empty authorization arrays mean the category authorization has not been curated here, not that an additive is prohibited. The FSSAI compendium is a ready-reference and the original Gazette notifications prevail. JECFA ADIs are not concentrations in products. WHO values are whole-diet guidance.

No runtime code, API integration, OCR integration, scoring logic or GitHub update is included.
