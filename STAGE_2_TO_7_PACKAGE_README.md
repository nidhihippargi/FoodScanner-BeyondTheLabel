# Food Scanner — Data Engine Stages 2–7 Package

This archive is designed to be copied into the repository root of `FoodScanner-BeyondTheLabel`. It contains `backend/` and `data-engineering/` additions.

## Assumption

The archive assumes your existing branch already contains the six Stage 1 contract files under `data-engineering/`, including `schemas/product.schema.json` and `schemas/ingredient.schema.json`. Those existing Stage 1 files are intentionally not duplicated in this archive. The tests and validators refer to those existing contracts.

## What it adds

- Stage 2: OFF API v3 barcode lookup adapter, parser, mapper, config, errors, `.env.example`, docs and synthetic OFF fixtures.
- Stage 3: 27 candidate ingredient aliases in CSV/JSON, with evidence/review metadata and documentation.
- Stage 4: conservative data cleaners, metadata parser, explicit unit conversions, validation helpers, deduplication, provenance-preserving merge/conflict handling and quality checks.
- Stage 5: MongoDB collection validators/indexes, migrations, alias seeding, repository classes and storage docs.
- Stage 6: tests, fixtures, integration examples and a test report template.
- Stage 7: README, integration/API/provenance/error/setup/handover documentation.

## Important project gates

- The source roadmap defines stages 0–7 only; it does not define Stage 8. No extra stage has been invented.
- OCR input shape remains provisional pending a real M1 sample and M1/M3/M6 approval.
- Backend module boundary, error envelope, serving-size ownership and conflict policy require M3/M6 confirmation.
- Alias review states are evidence notes, not project sign-off or Indian regulatory classifications.
- No OCR engine, matching algorithm, health verdict, medical flags, FSSAI threshold engine or mobile UI is included.
- No live OFF call or MongoDB Atlas migration was run.

## Before committing

Read `data-engineering/DATA_ENGINE_HANDOVER.md` and `data-engineering/DATA_ENGINE_VALIDATION_NOTES.md`. Install npm dependencies and execute the full local test command before committing the package.
