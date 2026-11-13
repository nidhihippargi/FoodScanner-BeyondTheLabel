# Data Storage Design — Stage 5

**Target database:** MongoDB Atlas (selected project direction)
**Status:** Storage implementation supplied; connection, network access, indexes and Atlas permissions must be configured by the repository owner before deployment.

## Collections

| Collection | Purpose | Uniqueness / indexes |
|---|---|---|
| `products` | Canonical product records and field provenance | Unique `recordId`; partial unique GTIN when value is a string; `updatedAt` descending |
| `ingredient_aliases` | Reference alias records from Stage 3 | Unique `ingredientId`; indexes on `canonicalName` and `aliases.name` |
| `data_sources` | Optional source-level audit records | Unique `sourceId` |

MongoDB collection validators are defined in `backend/src/data-engine/storage/mongo_schema.js`. They are intentionally a storage-oriented subset of the JSON Schema contracts; the full Draft 2020-12 validation remains in application code using Ajv. A MongoDB validator is not a substitute for application validation or cross-field provenance checks.

## Migrations

- `001_create_collections.js`: creates the collections, validators and indexes; applies `collMod` to existing collections. It does not drop collections.
- `002_seed_aliases.js`: idempotently upserts the approved/proposed reference entries from `data-engineering/ingredient_aliases.json`.
- `migrate.js`: connects using `MONGODB_URI` and `MONGODB_DB_NAME`, applies schema/index migration and seeds current reference data.

**Important:** Review this schema against any existing Atlas database before running migrations. `collMod` changes validation rules, and unique index creation can fail if existing duplicate data is present. Take a backup before applying migrations to a database with existing project data.

## Connection and security

- Store the Atlas URI in local `backend/.env` only.
- Never commit passwords, connection strings, or `.env`.
- Restrict Atlas network access and database user privileges to the least required for the development environment.
- The sample repository does not include a live Atlas connection string and no database migration was run against the team's account.

## Persistence boundary

Stage 1 JSON schemas stay the canonical data contract. MongoDB storage is a persistence implementation detail. `recordId` is the canonical application identifier; mapping to MongoDB `_id` is internal. M3/M6 should confirm whether products are shared across user scans and what retention/privacy policy applies before production persistence.
