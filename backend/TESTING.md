# Backend Testing – FoodScanner: Beyond the Label

## Running the tests
Run `npm test` from the backend directory.

## Latest test results
- All five standalone service test programs passed.
- Jest: 6 test suites passed, 32 tests passed.

## Standalone service tests
| Component | Test groups |
|---|---:|
| Claim verification | 7 |
| Ingredient and sugar alias detection | 7 |
| Nutrition normalization | 10 |
| Personalization | 10 |
| Product analysis integration | 7 |

## Jest test files
- Product.test.js
- SugarAlias.test.js
- UserPreference.test.js
- productController.test.js
- analysisController.test.js
- openFoodFactsService.test.js

## Functional areas tested
- Sugar alias detection and ingredient matching
- Nutrition normalization to per-100g or per-100ml
- Handling of already-normalized nutrition data
- Front-of-pack and back-of-pack claim verification
- Dietary preference matching
- Product analysis orchestration
- Product creation and barcode lookup
- Open Food Facts response mapping and error handling
- Model validation and controller responses

## Tools
- Jest for controller, model, and external-service tests
- Node.js for standalone service tests
- NYC for statement, branch, and function coverage of standalone service/data tests

## Limitations
- Model validation tests do not independently verify MongoDB unique-index enforcement.
- Claim verification and sugar classification are provisional application logic, not regulatory certification.
- Personalization does not guarantee absence of cross-contamination.
- External API tests use mocked responses.
- Jest and NYC coverage reports have different scopes and should not be combined into one overall percentage.
