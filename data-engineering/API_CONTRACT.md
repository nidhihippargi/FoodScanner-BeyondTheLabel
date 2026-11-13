# Data Engine API / Module Contract

**Status:** Internal module contract proposal; M3/M6 review required. This is not a public Express route specification.

## Operations

### `lookupByBarcode(barcode: string)`

Success return:

```json
{
  "outcome": "found",
  "product": { "schemaVersion": "1.0.0", "recordId": "..." },
  "validation": { "valid": true, "errors": [] },
  "warnings": []
}
```

`product` is the complete canonical product record, not just the abbreviated illustration above. `outcome` is `found` or `incomplete`. Errors thrown by the adapter include typed `code`, `statusCode`, `retryable` and `details` properties.

### `mapOcrPayload(payload, options?)`

Accepts the provisional M1 shape in `DATA_FLOW.md` and returns a canonical product record. The actual M1 contract must replace/confirm this proposal before production integration.

### `mergeObservations(existing, incoming, options?)`

Accepts two canonical records. Different non-null GTINs throw a `PRODUCT_CONFLICT` error. Conflicting field observations are kept as unresolved conflict entries.

## Error codes

| Code | Meaning | Retryable |
|---|---|---:|
| `CONFIGURATION_ERROR` | Required local configuration missing/invalid | No |
| `VALIDATION_ERROR` | Invalid barcode or canonical input | No |
| `OFF_PRODUCT_NOT_FOUND` | OFF has no product for barcode | No |
| `OFF_INVALID_RESPONSE` | Unexpected/malformed OFF JSON response | No |
| `OFF_UPSTREAM_ERROR` | OFF returned non-success HTTP response | Depends on status |
| `OFF_NETWORK_ERROR` | Timeout or connection problem | Yes |
| `PRODUCT_CONFLICT` | Cannot merge different GTINs | No |
| `DATA_ENGINE_ERROR` | Generic internal failure | No |

## REST boundary

M3 owns Express routes, authentication and the app's public JSON envelope. This module does not assume endpoints or response names not present in the repository. The sample result above is an internal function return example only.
