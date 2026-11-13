# Ingredient Intelligence — Source Register and Acquisition Plan

**Project:** Food Scanner — Beyond the Label
**Owner:** Member 2 — Data Engine
**Stage:** 2 — Research and verify information sources
**Version:** 1.0.0
**Research snapshot:** 2026-11-13
**Status:** Research register; source integration and data population have not started.

## 1. Purpose and decision summary

This register identifies candidate authorities/providers for the four reference datasets designed in Stage 1. It records what each source can support, how information can be retrieved, data freshness, reuse conditions and limitations.

### Recommended source strategy

| Dataset | Primary candidate | Acquisition approach | Decision |
|---|---|---|---|
| Generic nutrient composition | USDA FoodData Central Foundation Foods | Use Food Search + Food Details API for selected records; preserve FDC ID and nutrient metadata | **Proceed for selected generic foods**, with careful matching and provenance |
| Indian additive permissions | FSSAI Food Products Standards and Food Additives Regulations and original Gazette notifications | Human-curated structured records from official regulation/notification documents, with category, clause/table and effective dates | **Proceed with manual verification**; compendium is a convenience reference, not the legal instrument |
| Additive scientific evaluations / ADIs | WHO JECFA evaluation database; FAO JECFA additive specifications | Research each exact additive by name/INS/CAS; curate evaluation and ADI status with report/specification references | **Proceed as scientific evidence**, not as Indian legal permission |
| General dietary recommendations | WHO guideline pages and individual guideline publications | Curate versioned topic/population-specific rules and citations | **Proceed with scoped guideline records** |
| Indian food composition | ICMR-NIN Indian Food Composition Tables 2017 (IFCT) | Seek prior written permission from NIN before electronic storage/reproduction within a software product | **Do not import or embed yet**; permission gate required |

The project should not try to mirror all source datasets in the first implementation. The expanded database should support many records, but initial ingestion should be selective, reviewed and traceable.

## 2. Source register

### 2.1 USDA FoodData Central — generic nutrient composition

**Official links**
- Main data documentation: https://fdc.nal.usda.gov/data-documentation/
- API guide: https://fdc.nal.usda.gov/api-guide/
- Data downloads: https://fdc.nal.usda.gov/download-datasets/
- FAQ: https://fdc.nal.usda.gov/faq/

**What it provides**

FoodData Central contains distinct data types; they must not be treated as equivalent:

| Data type | What it represents | Suggested use in Food Scanner |
|---|---|---|
| Foundation Foods | Analytical data and metadata on individual samples of commodity and minimally processed foods | **Preferred USDA starting point** for generic ingredient composition |
| FNDDS | Foods and portions reported in dietary survey data | Possible supplementary food/portion reference; not the primary ingredient-composition catalogue |
| Branded Foods | Manufacturer/brand label information | Not the default generic-ingredient source; useful only when the matched branded product is genuinely the same item |
| Experimental Foods | Research foods supported by scientific publications | Use only when a precise relevant record exists and has been reviewed |
| SR Legacy | Historic Standard Reference dataset; final release was April 2018 | Legacy fallback only; do not present as the current primary source |

**Retrieval method**

1. Call Food Search with a candidate food name and, where necessary, data-type filters.
2. Review the returned candidates rather than taking the first search result blindly.
3. Select a source record whose description, preparation state and food form match the ingredient interpretation.
4. Retrieve Food Details using the selected FDC ID.
5. Map supported nutrient IDs/names and values, preserving unit, measurement basis, food description, FDC ID, data type, dataset/release context and retrieval timestamp.
6. Keep the original source response or a permitted minimal source snapshot where project retention rules allow it.

**Access and limits**
- A data.gov API key is required for API calls. The key must be stored in an environment variable/secret and must never be committed to Git.
- The official API guide documents a default rate limit of 1,000 requests per hour per IP; a 429 response indicates rate limiting.
- Search results and details are different operations. A search match is a candidate, not proof that the food is equivalent to the OCR ingredient.
- FDC data are public domain under CC0 1.0. USDA requests that FoodData Central be credited as the source.
- The download site lists Foundation Foods and Branded Foods releases dated October 2026 in the current download snapshot. Foundation Foods is updated in April and October; Branded Foods is updated monthly in the application/API, while downloadable archives are less frequent. Record the actual release/data type used rather than assuming all records update at the same frequency.

**Limitations and controls**
- A US generic food record may not represent an Indian cultivar, formulation, brand, processing method or preparation state.
- Similar terms can describe different food forms (for example raw vs roasted, whole vs refined, dry vs cooked). Do not auto-select on text similarity alone.
- A generic composition record is not the quantity of that ingredient in a packaged product and cannot be added into a finished-product nutrition estimate without verified recipe quantities and an approved calculation.
- Do not use a Branded Foods result as generic ingredient composition simply because the name is similar.

**Decision:** Use Foundation Foods first for generic nutrient records; use FNDDS only for justified supplementary cases. Keep branded foods and SR Legacy separately labelled. Implement API access in Stage 6, after Stage 3 schema finalization.

### 2.2 FSSAI — India-specific food additive permissions

**Official links**
- Regulations index: https://fssai.gov.in/food-law/regulations
- Food Products Standards and Food Additives amendment listing: https://fssai.gov.in/food-law/regulations/amendments/food-products-standards
- Food Products Standards and Food Additives compendium: https://www.fssai.gov.in/food-law/regulations/compendium/food-products-standards

**What it provides**

The Food Safety and Standards (Food Products Standards and Food Additives) Regulations, 2011 and subsequent Gazette notifications are the Indian regulatory source family for food-additive identity, permitted uses, food-category conditions and maximum levels, where specified.

The FSSAI site presents the compendium chapter-wise, including a dedicated chapter for substances added to food and food-category chapters such as dairy, fats/oils, cereals, confectionery, beverages and other foods. Regulatory entries must be interpreted with their category and conditions.

**Currency check at research snapshot (2026-11-13)**

The official FSSAI amendment listing for Food Products Standards and Food Additives displayed 85 amendment entries and showed Amendment No. 84 dated 10 July 2025 as the latest numbered amendment visible on that page. This is a snapshot of the page checked on the research date, not a guarantee that no later Gazette notification exists elsewhere. Recheck the official listing and Gazette before each regulatory data release.

**Critical legal-status warning**

FSSAI explicitly states that its compendium is a ready-reference consolidation and cannot be considered a legal document. Where the compendium has an error or overlap, the original notifications/amendments published in the Gazette of India prevail. Therefore:

- Use the compendium to locate relevant provisions efficiently.
- Verify each coded permission/limit against the corresponding original Gazette notification and amendment history before marking it reviewed/approved.
- Capture the exact food category, additive/INS identity, maximum-level basis/unit, conditions/notes, notification identifier, date and table/clause.
- A permission in one food category must not be applied to all categories.
- A missing row in the curated reference must be `not_assessed` or `not_found`, not automatically `not_permitted`.

**Retrieval method**

No public structured FSSAI additive API was identified in this source review. The implementation plan is controlled manual curation from official PDFs/notifications, with source locators and a second-person review for regulatory entries. Do not scrape or bulk-copy the portal as though it were an API.

**Reuse/redistribution status**

This review did not establish a blanket licence for republishing a derived FSSAI additive database. Store only the structured regulatory facts required by the project, keep exact official source citations/locators and have the project owner review intended redistribution. Do not reproduce large sections of source documents in the app.

**Decision:** FSSAI is the primary India-specific regulatory source. Treat original Gazette notifications as authoritative; the compendium is a navigation/consolidation aid. Regulatory interpretation and final approval require M6/project-owner review.

### 2.3 WHO/JECFA — additive scientific evaluations and ADIs

**Official links**
- WHO JECFA searchable evaluations database: https://apps.who.int/food-additives-contaminants-jecfa-database/Home/
- FAO JECFA databases and tools: https://www.fao.org/food-safety/scientific-advice/jecfa/databases-tools/en
- FAO online edition of the Combined Compendium of Food Additive Specifications: https://www.fao.org/food/food-safety-quality/scientific-advice/jecfa/jecfa-additives/en/

**What it provides**

The WHO JECFA evaluations database contains summaries of evaluations of flavours, food additives, contaminants, toxicants and veterinary drugs. Individual summaries may include chemical information, ADI/TDI information, links to reports/monographs/specifications and evaluation history. The database supports searching by partial name or CAS number and by functional class; it also exposes other identifiers in its interface.

FAO's additive specification database allows searches by additive name, INS number, CAS number and functional use. It provides the latest JECFA-evaluated additive specifications in PDF form.

**Currency check at research snapshot (2026-11-13)**

The WHO JECFA database stated that its content included updates through the 102nd JECFA meeting (June 2026). This is the latest update statement shown by the database during this review.

**Retrieval method**

- Search by exact additive name and preferably INS/CAS identifier where available.
- Confirm identity across synonyms and identifiers; names alone can be ambiguous.
- Record the ADI status exactly as the JECFA evaluation states it. Distinguish numeric ADI from statuses such as “not specified”, “not allocated”, “not established” or no available evaluation; do not collapse them into one status.
- Preserve evaluation meeting/date, report/monograph reference, specification reference and source link.
- Have the source interpretation reviewed before a record is marked approved.

**Important distinction**

JECFA scientific evaluation is not an Indian food-category permission. An ADI expressed relative to body weight is not the concentration in a food product. It cannot be compared with the presence/order of an ingredient in OCR text. Product exposure requires actual additive concentration and amount consumed, as well as appropriate body-weight context.

**Automation finding**

The official sources reviewed expose searchable web databases and documents. This review did not identify a documented public API contract for programmatic access. Stage 6 should therefore use curated, versioned reference records rather than assume automated JECFA scraping/API access. Any future automation requires confirmation of an official supported interface and terms.

**Decision:** Use WHO/JECFA as scientific evaluation evidence. Do not use it as a substitute for FSSAI permissions, nor claim an ADI is an individual product limit.

### 2.4 WHO — dietary recommendations

**Official links**
- Healthy diet fact sheet: https://www.who.int/news-room/fact-sheets/detail/healthy-diet
- WHO guideline portal and topic-specific links are provided from the fact sheet: sugars; saturated/trans fatty acids; sodium; total fat; carbohydrate intake and other topics.

**What it provides**

WHO provides dietary-level recommendations with explicit population and measurement contexts. The Healthy diet fact sheet checked in this review is dated 26 January 2026. It includes recommendations and guidance covering free sugars, fibre, fats, salt/sodium, potassium and dietary patterns.

Examples of distinctions that the data model must preserve:
- Free sugar recommendations are expressed as a percentage of total daily energy, with an illustrative gram equivalent under a stated 2,000 kcal diet assumption.
- Adult salt guidance is expressed in grams of salt/day and equivalent sodium/day; the fact sheet says children's sodium needs a different energy-based estimate.
- Saturated and trans fats are described as percentages of total energy, not as universal grams per ingredient.

**Retrieval method**

Manually curate a small, versioned rule record for each selected topic. Capture the exact WHO publication/guideline, date/version, population, comparison operator, unit, denominator/basis, assumptions, source paragraph/table and access date. For a quantitative rule, record the authority's exact scope; do not infer a child or individual-specific threshold from an adult population statement.

**Limitations**

- WHO dietary guidance is not a food-additive authorisation list.
- A population-level daily recommendation is not an automatic rating threshold for one product.
- “Free sugars”, “total sugars” and “added sugars” are not interchangeable fields. Ingredient names alone may not establish the quantitative amount of free/added sugar.
- A product's per-100 g label value needs to be interpreted separately from an individual's total daily intake.

**Decision:** Use WHO for carefully scoped, topic-specific dietary guidance. M3 must decide how any guideline is used by the scoring method; M2 stores the source facts only.

### 2.5 ICMR-NIN — Indian Food Composition Tables (IFCT 2017)

**Official link**
- IFCT 2017 publication: https://www.nin.res.in/ebooks/IFCT2017.pdf

**What it provides**

IFCT 2017 is a valuable Indian food-composition reference containing nutrient values for analysed Indian foods. It is more locally relevant than relying exclusively on US composition records for common Indian food items.

**Critical reuse condition**

The publication states that personal-use reproduction with full acknowledgement is allowed, but no part of the publication may be stored or reproduced in electronic format for creating a product without prior written permission from the National Institute of Nutrition, Hyderabad.

**Decision:** Do not copy IFCT tables into JSON, MongoDB, application assets or a distributed product until written permission for the intended electronic product use has been obtained. Stage 2 records IFCT as a candidate source only. The project may seek permission; until then, use an approved alternative source and clearly disclose geographic coverage limitations.

## 3. Cross-source comparison

| Source | Main fact type | Public structured API identified? | Data/reuse notes | Required review |
|---|---|---|---|---|
| USDA FDC | Generic and branded nutrient composition | Yes: Food Search and Food Details | CC0; credit FDC; API key required; rate limit applies | Food identity, preparation state, units, source type and nutrient mapping |
| FSSAI | Indian additive rules/food-category limits | No API identified in this review | Official compendium is not the legal instrument; Gazette notifications prevail | Category, conditions, exact notification/date and regulatory interpretation |
| WHO JECFA | Additive scientific evaluations, ADI and specifications | No documented public API identified in this review | Searchable web databases and linked reports/specifications | Exact chemical identity, ADI status, meeting/report and distinction from regulation |
| WHO dietary guidance | Population-level dietary recommendations | No API identified in this review | Curated official publications | Population, denominator, scope, units and publication version |
| ICMR-NIN IFCT 2017 | Indian food nutrient composition | No API identified in this review | Prior written NIN permission required for electronic storage/reproduction to create a product | Permission, exact food form, nutrient/unit interpretation |

## 4. Data acquisition policy for the project

1. **Do not bulk-import first.** Start with a selective list of high-priority foods/additives after Stage 3 schema approval.
2. **Keep provider facts separate.** A provider's raw description and measurements are not rewritten as a project health conclusion.
3. **Use a source ID.** Retain USDA FDC ID, INS number, regulatory notification ID, JECFA evaluation reference or WHO guideline identifier where available.
4. **Keep source/version dates.** Record publication/effective date, retrieval/access date and dataset version separately.
5. **Store measurement context.** Preserve food state, edible portion, basis, unit, population, jurisdiction, food category and conditions.
6. **Use explicit statuses.**
   - `not_found`: a defined search in a named source/version found no record.
   - `not_assessed`: the project has not researched/evaluated the item.
   - `unknown`: the source/evidence does not establish the fact.
   - `needs_review`: evidence exists but has not passed review.
7. **No inference from label order.** Ingredient list position does not give an exact gram quantity or additive concentration unless an applicable rule/source explicitly provides that conclusion.
8. **Do not mix units of policy.** FSSAI maximum level in food, JECFA ADI per kg body weight/day, and WHO dietary recommendation per day or percent energy are separate data types.
9. **Respect terms.** Keep API secrets out of Git; do not embed IFCT without permission; review redistribution and attribution requirements for every dataset.
10. **Review regulatory/scientific claims.** Only records with exact source references and the required project review may be marked approved.

## 5. Implementation implications for later stages

- **Stage 3:** Finalize schema fields for source IDs, release/version, retrieval/access date, license status, food category, preparation state, guideline population and ADI status.
- **Stage 4:** Populate generic ingredient identities and USDA composition records selectively. IFCT remains blocked unless written permission is obtained.
- **Stage 5:** Curate FSSAI category permissions, JECFA evaluations and WHO dietary guidance with source-level review.
- **Stage 6:** Implement USDA API client using environment-based key management, timeouts, rate-limit handling and explicit candidate selection. Implement lookups against curated FSSAI/JECFA/WHO records; do not assume unsupported APIs.
- **Stage 7:** Integrate lookup results after M1 confirms OCR payload and M3 approves ingredient-ID matching contract.
- **Stage 8:** M3 decides how eligible information feeds scoring. M2 must never infer product composition from generic ingredients.

## 6. Research limitations and next review

This is a source-selection and acquisition-method review, not a legal opinion, toxicological assessment or completed database import. Before releasing populated regulatory or health guidance records, re-check the primary source for amendments and effective dates and obtain the appropriate reviewer approval.

**Stage 2 exit criteria**
- [x] Candidate source identified for each reference dataset.
- [x] Retrieval method recorded.
- [x] Source freshness/version behavior recorded where published.
- [x] Licensing/reuse gate documented for USDA and IFCT.
- [x] FSSAI compendium vs original Gazette distinction documented.
- [x] JECFA ADI vs Indian permissions distinction documented.
- [x] WHO population/dietary recommendation scope documented.
- [ ] Project owner/M6 accepts the source register and permission policy.

## 7. Official references checked on 2026-11-13

1. USDA FoodData Central, Data Type Documentation: https://fdc.nal.usda.gov/data-documentation/
2. USDA FoodData Central, API Guide: https://fdc.nal.usda.gov/api-guide/
3. USDA FoodData Central, Download Datasets: https://fdc.nal.usda.gov/download-datasets/
4. USDA FoodData Central, FAQ: https://fdc.nal.usda.gov/faq/
5. FSSAI, Regulations: https://fssai.gov.in/food-law/regulations
6. FSSAI, Food Products Standards and Food Additives Amendments: https://fssai.gov.in/food-law/regulations/amendments/food-products-standards
7. FSSAI, Food Products Standards and Food Additives Compendium: https://www.fssai.gov.in/food-law/regulations/compendium/food-products-standards
8. WHO, JECFA Evaluations Database: https://apps.who.int/food-additives-contaminants-jecfa-database/Home/
9. FAO, JECFA Databases and Tools: https://www.fao.org/food-safety/scientific-advice/jecfa/databases-tools/en
10. FAO, Combined Compendium of Food Additive Specifications: https://www.fao.org/food/food-safety-quality/scientific-advice/jecfa/jecfa-additives/en/
11. WHO, Healthy Diet fact sheet (26 January 2026): https://www.who.int/news-room/fact-sheets/detail/healthy-diet
12. ICMR-NIN, Indian Food Composition Tables 2017: https://www.nin.res.in/ebooks/IFCT2017.pdf
