# Stage 4 Validation Report

**Date:** 2026-11-13
**Schema dialect:** JSON Schema Draft 2020-12
**Validator:** Python jsonschema with format checking

| Check | Result |
|---|---:|
| Ingredient reference records | 40 valid / 40 |
| Nutrient composition records | 43 valid / 43 |
| Unique ingredient IDs | 40 / 40 |
| Unique composition IDs | 43 / 43 |
| Ingredient-to-composition references | 43 resolved |
| Composition-to-ingredient references | 43 resolved |
| Schema/data errors | 0 |

## Scope

This verifies JSON shape, field types, formats, IDs and dataset relationships. It does not verify the candidate nutrient values against the live USDA API or the October 2026 release. The 37 secondary-index transcriptions remain `needs_review` pending Stage 6 official revalidation. The six USDA SR28 records are `reviewed` as historical table transcriptions only.
