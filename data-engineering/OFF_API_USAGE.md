# Open Food Facts API Usage — Stage 2

**Review date:** 2026-11-12
**Implementation target:** Open Food Facts API v3 (current schema family v3.6 at review time)
**Environment:** staging for development/tests; production only after project approval.

## Endpoint

Product lookup by barcode uses the documented read endpoint:

```http
GET https://world.openfoodfacts.org/api/v3/product/{code}?fields=...
Accept: application/json
User-Agent: FoodScanner-DataEngine/0.1 (maintainer contact)
```

The route is `/api/v3/product/{code}`. The documentation currently lists v3.6 as the latest product/API schema version, but the route remains `/api/v3/product/{code}`; do not construct `/api/v3.6/product/...` unless the official API contract changes.

The `fields` parameter is a comma-separated field list. The adapter requests a bounded set used by the mapper. The API defaults to all fields for read requests if `fields` is omitted; keep the field list reviewed as the mapping evolves.

## Environments

- Production: `https://world.openfoodfacts.org`
- Staging: `https://world.openfoodfacts.net`
- Staging requires HTTP Basic Authentication with username `off` and password `off`, as documented by OFF. Keep these values in local environment configuration, not source code. Test against staging, not production, to avoid polluting production data.

## Request identification and rate limits

Send an identifying User-Agent in the documented form `app_name/app_version (URL or contact info)`. The adapter requires `OFF_USER_AGENT` and does not invent contact details. At the review date, the API overview documents separate per-IP read/search request limits; product reads are 15 requests/minute/IP and search requests are 10 requests/minute/IP. A 429 or 5xx is treated as retryable, but automatic retries are not implemented: M3 should decide retry/backoff and request coalescing policy. A 503 may also indicate service-wide overload.

## Response handling

The v3 read response is a JSON envelope with optional `status` (`success`, `success_with_warnings`, `success_with_errors`, `failure`), `warnings`, `errors`, and `product`. The client maps HTTP 404 to a typed product-not-found error. A 2xx response without a product object is treated as malformed unless the documented failure body indicates a not-found result. The adapter validates a returned `product.code` when present to protect against barcode mismatches.

The OFF product schema and API are actively developed. The v3.6 change log describes schema changes; the mapper supports the fields explicitly mapped in `mapping/off_mapper.js` and `mapping/nutrient_mapper.js`, ignores unknown source properties, and must be updated only against reviewed official schema paths. A source response field not supported by the mapper is not copied into the canonical record.

## Field selection and mapping

The default field request in `config.js` includes product identifier, name, brand, quantity, ingredient text/language, serving size, nutrition and image fields. The mapper accommodates the current structured `nutrition.aggregated_set` representation and a limited legacy `nutriments` fallback. The fallback is compatibility code, not a guarantee that all response versions return legacy fields.

Nutrient data should distinguish source-entered values/units from computed values and their basis. Preserve `per_100g`, `per_100ml` and `per_serving` separately. Do not infer a basis when the source does not identify it. Total sugars in the nutrition table is not the same thing as identifying an ingredient alias or proving an added-sugars quantity.

## Attribution and licensing checklist

Before release, the project owner should:

1. Review the OFF terms and attribution guidance for the intended use.
2. Attribute the Open Food Facts database wherever product facts are displayed or distributed as required.
3. Preserve applicable ODbL/Database Contents License obligations for copied or adapted data.
4. Review image-specific CC BY-SA attribution/share-alike requirements separately from database text/data; do not assume image rights are identical to the database license.
5. Record the source as Open Food Facts in product provenance and show appropriate attribution in M4 UI (M4/M6 approval).
6. Contact OFF reuse support or register intended usage if required by the then-current terms.

This technical document is not legal advice. Re-check current terms before public release.

## Configuration

Copy `backend/.env.example` to `backend/.env` and set `OFF_USER_AGENT`. Keep `.env` untracked. For development use the staging URL plus `OFF_BASIC_AUTH_USER=off` and `OFF_BASIC_AUTH_PASSWORD=off`. Do not commit access tokens, database connection strings or passwords.

## Verification record

Official sources reviewed 2026-11-12:

- API introduction: https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/
- Product by barcode endpoint: https://openfoodfacts.github.io/documentation/docs/Product-Opener/v3/products/get-api-v3-product-code/
- Product/API schema change log: https://openfoodfacts.github.io/openfoodfacts-server/api/ref-api-and-product-schema-change-log/
- Nutrition data explanation: https://openfoodfacts.github.io/documentation/docs/Product-Opener/dev/explain-nutrition-data/
- License guide: https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/tutorials/license-be-on-the-legal-side/

No live API integration test is claimed by this document. Stage 6 tests use local fixtures and mocked HTTP responses.
