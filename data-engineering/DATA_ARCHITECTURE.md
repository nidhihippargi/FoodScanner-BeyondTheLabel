# Data Engine Architecture

**Project:** Food Scanner — Beyond the Label
**Stage:** 1 — Architecture & schemas
**Version:** 1.0.0 (proposed for review)
**Status:** Proposed; requires M1, M3 and M6 contract review before implementation.

## 1. Purpose and ownership

The Data Engine is the application's shared product-data layer. It accepts product facts from approved sources, maps them into one predictable product record, preserves original values and provenance, reports missing or conflicting information, and supplies structured data to the backend analysis module.

It owns:

- The common product and ingredient-reference data contracts.
- Open Food Facts (OFF) product-data adaptation, planned for Stage 2.
- The input contract for OCR output produced by Member 1 (M1); it does not perform OCR.
- Field-level source and extraction metadata.
- Data validation, missing-value representation, and conflict reporting.
- Data dictionary, mapping and integration documentation.

It does **not** own barcode detection, image capture, OCR, ingredient alias matching, nutritional interpretation, claim verification, personalised analysis, medical conclusions, or the mobile UI. M3 owns analysis semantics; M6 owns cross-module architecture and final shared contracts.

## 2. Confirmed project context and implementation target

The project technology decision shown in the Stage 0 stack summary is:

| Concern | Selected project technology |
|---|---|
| Mobile app | React Native |
| Language | JavaScript |
| Backend runtime | Node.js |
| Backend framework | Express.js |
| Database | MongoDB Atlas |
| Client/server communication | REST API |
| Payload format | JSON |
| OCR / barcode libraries | Google ML Kit (M1-owned) |
| Product lookup source | Open Food Facts |
| Version control | Git + GitHub |

The repository's `main` branch currently contains only empty role folders and README placeholders. No Node project, Express application, database setup, OCR sample, or pre-existing contract was present at the time of this review. The stack above is therefore treated as the project's selected direction, not as an already implemented repository state.

**Architecture recommendation:** implement the Data Engine as a modular JavaScript package/module inside the existing backend application, rather than as a separately deployed microservice. This keeps the initial student-team MVP simple and lets Express/M3 orchestrate calls without adding another network boundary. M3 and M6 must approve this module boundary. The top-level `data-engineering/` folder remains the home for this role's schemas and technical documentation; runtime code placement should be agreed with M3 before Stage 2.

## 3. Logical architecture

```text
React Native app (M4)
        |
        | REST/JSON request (barcode or OCR submission)
        v
Express backend / orchestration (M3)
        |
        +-------------------------------+
        |                               |
        v                               v
Data Engine module                 Analysis / business logic (M3)
        |                               ^
        +-- OFF adapter                |
        |      |                       |
        |      v                       |
        |   Open Food Facts             |
        |                               |
        +-- OCR payload adapter <--- M1 Vision (ML Kit)
        |                               |
        +-- source parser / mapper      |
        +-- canonical product record --+
        +-- schema validation
        +-- provenance and conflict handling
        +-- quality / missing-data metadata
        |
        v
Storage adapter (Stage 5; MongoDB Atlas target)

M5 Verification consumes agreed fixtures and expected records.
M6 Architect reviews module boundaries, schemas and integration contracts.
```

The mobile app must communicate with the backend, not directly with Open Food Facts or the Data Engine. M1 sends extracted barcode/OCR data through the interface agreed with M3/M6. The Data Engine accepts those inputs and returns a canonical record; M3 applies analysis rules and builds the user-facing analysis response.

## 4. Layers and responsibilities

| Layer | Responsibility | Owner / reviewer |
|---|---|---|
| Input orchestration | Receives barcode/OCR request and decides which adapter to invoke | M3; M1 provides payload |
| Source adapters | Isolate source-specific formats (OFF response, OCR payload) | Data Engine |
| Parsing and mapping | Extract only supported fields and map them to canonical names | Data Engine |
| Canonical contracts | Define product and ingredient-reference shapes | Data Engine; M6 approval |
| Validation | Check type, shape, allowed status and unit structure | Data Engine |
| Provenance | Record source, extraction method, source field, time and OCR confidence when supplied | Data Engine |
| Conflict handling | Preserve competing values and expose unresolved conflicts; never silently overwrite | Data Engine with M3 policy approval |
| Analysis | Alias matching, serving-size calculations, claim comparison and personalisation | M3 |
| Storage | Persist product and reference data | Stage 5; MongoDB Atlas target; M3/M6 review |
| Presentation | Display scan and analysis results | M4 |
| Verification | Define scenarios and report expected/actual results | M5 |

## 5. Canonical product-record principles

1. **Missing is not zero.** A missing nutrient has a `null` value and `status: "missing"`; it is never represented as numeric `0`.
2. **Preserve source values.** Original text, original numeric value, original unit and declared basis are retained when available.
3. **Separate value from status.** Each important field indicates whether it is available, missing, unverified or conflicting.
4. **Provenance is field-level.** A field can reference one or more source records and include an extraction method, source field path, observation time and confidence when the source provides it.
5. **No silent merge.** If OFF and OCR disagree, keep candidate values in a conflict entry until an agreed rule or human review resolves it.
6. **Do not infer unsupported facts.** Do not manufacture nutrition values, ingredient text, serving sizes, or source confidence.
7. **Keep data and analysis separate.** Recognising an ingredient name does not establish added-sugar content, total-sugars nutrition, or a health outcome.
8. **Schema stays source-neutral.** OFF-specific fields belong in the mapper, not in the canonical product record.

## 6. Contract and validation strategy

- JSON Schema Draft 2020-12 is the Stage 1 machine-readable contract format.
- The schemas use JSON-friendly strings for identifiers and timestamps. MongoDB-specific `_id` and BSON choices are deferred to Stage 5.
- Schema validation checks structure and primitive types. Cross-field rules (for example, that a provenance `sourceId` exists in `sourceRecords`) require application-level validation in a later implementation stage.
- Unknown source fields should be ignored by source adapters unless explicitly mapped; source payloads must not be copied wholesale into the canonical record.
- `schemaVersion` identifies the canonical contract version. A schema change must be reviewed by M3/M6 because later stages depend on it.
- A future MongoDB collection validator may be derived from the JSON Schemas, but its exact form is a Stage 5 decision.

## 7. Recommended module boundary

Proposed internal module responsibilities (not implementation files yet):

```text
backend/
  src/
    data-engine/
      adapters/       # OFF and OCR input adapters
      mapping/        # source -> canonical field mapping
      validation/     # JSON Schema and cross-field checks
      provenance/     # source and field metadata
      conflicts/       # conflict construction and resolution metadata
      index.js         # module entry point (proposed)
```

This is an illustrative target only. The repository does not yet contain `backend/src/`; do not create these runtime directories during Stage 1. M3 should decide whether this layout fits its backend organisation.

## 8. Open decisions and required approvals

| ID | Question / decision | Current proposal | Required confirmation |
|---|---|---|---|
| A1 | Data Engine deployment boundary | In-process module inside Express backend | M3 + M6 |
| A2 | M1 OCR payload shape | Use the proposed input shape in `DATA_FLOW.md` as a starting contract | M1 + M6 |
| A3 | Common API response envelope | Return the canonical product object internally; M3 wraps it in the app's REST response | M3 + M6 |
| A4 | Conflict resolution precedence | No automatic source winner; preserve conflict pending explicit rule | M3 + M6 |
| A5 | Unit conversion policy | Preserve originals; allow only deterministic, documented unit conversions in Stage 4 | M3 |
| A6 | OFF API version and exact request fields | Reconfirm in Stage 2; official docs currently identify v3.6 as current and v2 as deprecated | Data Engine |
| A7 | Storage mapping | JSON schemas remain storage-neutral until Stage 5; MongoDB Atlas is target | M3 + M6 |
| A8 | Ingredient-reference category vocabulary | Proposed in `ingredient.schema.json`; validate with M3 before Stage 3 dataset creation | M3 + M6 |

## 9. Scope and safety boundary

The schema stores factual product information and data-quality metadata. It does not contain a healthy/unhealthy verdict, disease flag, medical recommendation, or diagnosis. FSSAI/WHO thresholds and condition-specific flags remain excluded unless the requirements and project owners explicitly approve a researched change in scope.

## 10. References

- Open Food Facts API introduction: https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/ (accessed 2026-11-12). The official page identifies API v3.6 as current and v2 as deprecated, notes that product records are community-contributed and may be incomplete, and documents request limits and custom User-Agent expectations.
- Open Food Facts API and product schema change log: https://openfoodfacts.github.io/openfoodfacts-server/api/ref-api-and-product-schema-change-log/ (accessed 2026-11-12). The change log documents breaking product-schema changes and advises consumers to ignore unknown fields rather than depend on undocumented ones.
- Open Food Facts nutrition data explanation: https://openfoodfacts.github.io/documentation/docs/Product-Opener/dev/explain-nutrition-data/ (accessed 2026-11-12). It distinguishes entered nutrient values/units from per-100g and per-serving values.
