# Data Cleaning and Transformation Rules — Stage 4

## Principles

- Preserve the exact source string/value/unit alongside every normalised representation.
- Missing is not zero.
- A failed parse is not silently repaired or dropped; retain raw input and set a missing/unverified status with a reason.
- Cleaning is not ingredient alias matching or nutrition analysis.
- Never convert mass to volume or salt to sodium without a separate approved, scientifically justified rule.
- Do not perform serving-based nutrition calculations in this Data Engine module; M3 owns the application analysis calculation unless the team changes ownership.

## Rules implemented

| Component | Rule | Preserved information | Failure/uncertainty behaviour |
|---|---|---|---|
| Ingredient text cleaner | Unicode NFKC, dash normalization, whitespace collapse, lowercase comparison string | Original exact text | Non-string input rejected; no synonym substitution |
| Nutrient label mapper | Conservative exact normalized label map | Source label is expected to remain available in source observation/notes | Unknown label returns null; no guessed nutrient key |
| Serving-size parser | Parse a simple number + supplied unit where unambiguous | Exact raw serving-size text | Returns null value and `unverified` if ambiguous; parse is metadata only |
| Unit standardiser | Documented mass, volume and energy conversions | `originalValue` and original unit | Throws for unknown/incompatible dimensions |
| Validator | JSON Schema shape + finite non-negative numeric checks | Full record and validation errors | Reject invalid records before handover to M3 |
| Dedupe | Exact GTIN only | Original record IDs and duplicate report | No fuzzy name/brand merge |
| Source merger | Same GTIN required; merge only compatible observations | Source records, field provenance, unresolved conflicts | Conflicts remain explicit; no silent source precedence |
| Quality checks | Derive completeness/missing/unverified/conflicted paths | Record data unchanged | Quality is a data sufficiency state, never a health score |

## Unit conversion reference

Implemented deterministic groups:

- Mass: `kg`, `g`, `mg`, `mcg`/`µg`.
- Volume: `l`, `ml`.
- Energy: `kcal`, `kJ`, using `1 kcal = 4.184 kJ`.

Not implemented:

- Mass ↔ volume conversion (requires density).
- Salt ↔ sodium conversion (not included without explicit domain approval).
- Per-serving ↔ per-100g nutrition scaling (owned by M3 unless reassigned).
- Any nutrient-risk threshold or health classification.

## Before/after examples

See `samples/cleaning_before_after.json`. Examples are synthetic and illustrate transformations only.
