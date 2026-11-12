# Setup and Execution

## Requirements

- Node.js 20 or later (development was prepared for Node 20+; Node 22 is also suitable).
- npm.
- MongoDB Atlas URI only for Stage 5 migration/persistence exercises.
- Network access for npm installation and optional OFF staging calls.

## 1. Install dependencies

From repository root:

```bash
cd backend
npm install
```

## 2. Configure OFF

```bash
cp .env.example .env
```

Edit `backend/.env` and set a descriptive `OFF_USER_AGENT`, for example:

```env
OFF_USER_AGENT=FoodScanner-DataEngine/0.1 (your-project-contact)
OFF_BASE_URL=https://world.openfoodfacts.net
OFF_API_VERSION=v3
OFF_BASIC_AUTH_USER=off
OFF_BASIC_AUTH_PASSWORD=off
```

The OFF staging credentials shown here are documented public staging credentials. If using production, set `OFF_BASE_URL=https://world.openfoodfacts.org` and remove the basic-auth variables. Never commit `.env`.

## 3. Run local tests

```bash
npm test
```

The test suite is fixture/mock based and should not require live OFF or Atlas credentials. The schema tests use Ajv Draft 2020-12 and `ajv-formats`.

## 4. Optional manual OFF staging lookup

After installing dependencies and setting `.env`, run the following from `backend/`:

```bash
node - <<'NODE'
const { createDataEngine } = require('./src/data-engine');
(async () => {
  const engine = createDataEngine();
  const result = await engine.lookupByBarcode('3274080005003');
  console.log(JSON.stringify({ outcome: result.outcome, recordId: result.product.recordId, valid: result.validation.valid }, null, 2));
})().catch((error) => {
  console.error({ code: error.code, message: error.message, retryable: error.retryable });
  process.exitCode = 1;
});
NODE
```

This is a manual live-network check, not part of `npm test`; run only against OFF staging. Product availability can change.

## 5. Optional MongoDB Atlas migration

Set `MONGODB_URI` and `MONGODB_DB_NAME` in local `.env`. Use a disposable/dev database and back up existing data first. Then from `backend/`:

```bash
npm run migrate
```

This creates or updates the three collection validators/indexes and seeds alias reference records. It is not safe to run against an important database without reviewing existing data and unique-index conflicts.

## 6. Use as an internal backend module

M3 imports the module into its Express backend. The Data Engine does not start an HTTP server or own app routes. See `INTEGRATION_GUIDE.md` and `API_CONTRACT.md`.
