# Food Scanner: Beyond the Label

Scan a barcode or a nutrition label, then get a deterministic 0-100 health score, traffic-light findings, hidden-sugar and additive detection, label-claim checking, and allergen/diet conflicts.

```
frontend/        Expo (React Native, JS)  - Scan, OCR Review, Findings, Preferences, History
backend/         Express REST API + MongoDB Atlas (Mongoose) with in-memory fallback
vision/          Barcode validation (GS1 checksum), OCR cleaning, OCR confidence
data-engineering/ Open Food Facts client, regex OCR parser, offline mock products
verification/    Rule engine: score, grade, flags, warnings, positives, claimCheck
tests/           Integration tests + Postman collection
```

## Run

```bash
npm run install:all          # installs backend + frontend deps
npm test                     # unit + integration tests (Node >= 18, no install needed except for the live HTTP smoke test)
npm run backend              # http://0.0.0.0:5000   (optional: MONGO_URI=mongodb+srv://...)
cd frontend && npx expo install --fix && npm start
```

Physical phone: same Wi-Fi as the computer. The app derives the backend address from the Expo dev server host; override with `EXPO_PUBLIC_API_URL=http://<LAN-IP>:5000`.

Set `OFFLINE=1` on the backend to skip Open Food Facts and use bundled demo products.

## Demo barcodes

| Product | Barcode |
|---|---|
| Maggi 2-Minute Masala | 8901058851298 |
| Lay's Classic Salted | 8901491101837 |
| Coca-Cola | 5449000000996 |
| Bournvita | 8901000000019 |

Mock nutrition values are illustrative approximations, not official label data. Only Maggi's barcode is the real one; the others are valid-checksum demo codes.

## API contract

Every response is `{ "success": true, "data": ... }` or `{ "success": false, "error": { "code", "message" } }`.

| Route | Body | Returns |
|---|---|---|
| GET /api/health | | `{ status, db, time }` |
| POST /api/scan/barcode | `{ barcode }` | `{ barcode, product, source }` |
| POST /api/scan/ocr | `{ text, engineConfidence? }` | `{ ocr: { confidence, level, missing, needsReview, cleanedText }, product }` |
| POST /api/analyze | `{ product \| barcode \| text, preferences? }` | `{ scanId, method, product, analysis }` |
| GET / DELETE /api/history | | `{ items, db }` / `{ cleared }` |

`preferences` = `{ allergens: [], diets: [], conditions: [] }` (ids in `verification/rules.js`; conditions: diabetes, hypertension, pku, gout, children).

`analysis` = `{ score, grade, flags[], warnings[], positives[], claimCheck[], nutriScore, nova, personalVerdict, dataCompleteness, disclaimer }`.

## Known limits

- Traffic-light cut-offs are FSA-style, aligned with WHO guidance, and configurable in `verification/rules.js`. Verify them against the current FSSAI notification before making any regulatory claim.
- Nutri-Score is a simplified approximation (no fruit/veg/nuts points).
- On-device ML Kit OCR needs an Expo development build (`npx expo run:android|ios`); in Expo Go the review screen falls back to pasting/typing label text.
