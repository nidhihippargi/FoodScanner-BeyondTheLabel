# Backend Data Engine Module — Stages 2–7

This `backend/` folder contains an internal Data Engine module. It is not a complete Express server and intentionally does not create public Express routes; M3 owns server orchestration and public API envelopes.

## Structure

```text
backend/
  package.json
  .env.example
  src/data-engine/
    adapters/      OFF client + response parser
    mapping/       OFF and provisional OCR field mapping
    validation/    Draft 2020-12 + provenance checks
    cleaning/      ingredient text, nutrients, units, serving metadata, dedupe
    merging/       source conflict-safe merge
    quality/       data completeness summary
    storage/       Mongo schemas, migrations, repositories
  test/            node:test unit and fixture-based integration tests
```

## Responsibilities

- `lookupByBarcode()` retrieves and adapts OFF product information.
- `mapOcrPayload()` handles only the proposed M1 payload; do not wire it until M1/M6 confirm the interface.
- `mergeObservations()` preserves conflicting values and refuses cross-GTIN merges.
- `createRepositories(db)` exposes MongoDB persistence helpers after Stage 5 migration.

## Local commands

```bash
npm install
cp .env.example .env
# Edit .env and set OFF_USER_AGENT before running OFF lookup
npm test
```

Use `npm run migrate` only with a disposable/development Atlas database after configuration and backup. See `../data-engineering/SETUP_AND_EXECUTION.md`.
