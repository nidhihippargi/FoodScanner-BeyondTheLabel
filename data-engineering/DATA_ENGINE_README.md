# Food Scanner Data Engine

This folder contains the Data Engine's contracts, source mappings, reference alias data, OFF fixtures and technical documentation. Runtime JavaScript is in `backend/src/data-engine/`.

## Responsibility

The Data Engine retrieves and adapts product facts, represents ingredients/nutrition in a canonical structure, preserves provenance, validates source data, reports missing/conflicting information and supplies data to M3. It does not perform OCR, ingredient-alias matching algorithms, serving-size nutrition analysis, health scoring, claim verification, medical advice or UI rendering.

## Project stack direction

JavaScript / Node.js, Express.js backend, MongoDB Atlas target, REST and JSON; React Native client and ML Kit OCR/barcode are other team modules. The repository originally contained only scaffold placeholders. The data-engine module is designed to be imported by M3's backend rather than run as a separate microservice. M3/M6 approval of this boundary is still required.

## Layout

```text
backend/
  src/data-engine/       # OFF adapter, mapping, validation, cleaning, quality, storage
  test/                  # unit and fixture-based integration tests
data-engineering/
  schemas/               # Stage 1 canonical JSON Schemas
  fixtures/              # synthetic OFF response fixtures
  samples/               # synthetic cleaning and proposed OCR examples
  ingredient_aliases.*  # 27-entry candidate dataset
  *.md                   # dictionary, mapping, rules, usage, handover docs
```

## Quick start

See `SETUP_AND_EXECUTION.md`. Install dependencies inside `backend/`, copy `.env.example` to `.env`, provide a descriptive `OFF_USER_AGENT`, run `npm test`, and only use `npm run migrate` after configuring a disposable/development MongoDB Atlas database.

## Important status

The OFF client uses documented API v3 barcode read route and supports current structured nutrition data with a compatibility fallback. M1 OCR input remains a proposed contract. Alias records are candidate reference data only; M3/M6/project owner must review them. No live OFF request, Atlas migration, M1 integration, M3 integration or M6 approval is claimed by this deliverable.
