# Data Engine Test Report

**Build/commit:**
**Date:**
**Tester:**
**Node version:**
**Environment:** Local / OFF staging / Atlas dev (circle one)

> Only enter Pass/Fail for tests that were actually executed. Mark not run tests as Not Run. Do not present fixture/mock tests as live service tests.

| ID | Area | Test command/scenario | Expected result | Actual result | Status | Notes / evidence |
|---|---|---|---|---|---|---|
| T-01 | Product schema | Validate canonical product fixture | Valid |  | Not Run |  |
| T-02 | Ingredient schema | Validate every alias JSON entry | Valid |  | Not Run |  |
| T-03 | OFF adapter | Mock 200 product response | Parsed and mapped |  | Not Run | Mock only |
| T-04 | OFF adapter | Mock HTTP 404 | Typed not-found error |  | Not Run | Mock only |
| T-05 | OFF adapter | Mock 429/503 | Retryable upstream error |  | Not Run | Mock only |
| T-06 | OFF adapter | Mock invalid JSON/shape | Typed invalid response |  | Not Run | Mock only |
| T-07 | Cleaning | Ingredient normalization | Raw retained; normalized comparison string |  | Not Run |  |
| T-08 | Units | Mass/volume/energy conversion | Approved dimensions only |  | Not Run |  |
| T-09 | Missing data | Null nutrient/field remains missing | No fabricated zero |  | Not Run |  |
| T-10 | Conflict | OFF/OCR disagree | Both candidates retained |  | Not Run |  |
| T-11 | Storage | Mongo migration on disposable Atlas DB | Collections/indexes created |  | Not Run | Never use production DB for test |
| T-12 | Integration | OFF fixture → mapping → OCR merge → schema validation | Canonical record valid |  | Not Run | Local synthetic fixture |

## Summary

- Executed:
- Passed:
- Failed:
- Not run:
- Known limitations:
- Reviewer sign-off:
