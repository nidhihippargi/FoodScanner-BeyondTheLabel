# Stage 5 — Additive and Dietary Guideline Reference Notes

**Prepared:** 2026-11-13
**Datasets:** \`additive_reference.json\` (15 additive identities), \`dietary_guidelines.json\` (9 WHO guideline records)
**Status:** Curated starter dataset; not legal or medical advice; M3/M6 and qualified review required before production scoring or compliance claims.

## 1. Sources checked

### FSSAI

- Appendix A, Food Category System and Use of Additives, Version 3 (01.08.2025): https://fssai.gov.in/upload/uploadfiles/files/Appendix%20A%284%29.pdf
- FSSAI Food Products Standards and Food Additives compendium page: https://www.fssai.gov.in/food-law/regulations/compendium/food-products-standards
- FSSAI amendment register: https://fssai.gov.in/food-law/regulations/amendments/food-products-standards

The Appendix A data records retain food category, additive/group wording, INS, maximum level, units, notes and table locator. FSSAI's compendium page explicitly says the consolidated compendium is not a legal document and original Gazette notifications prevail in case of error/overlap. The amendment register showed Amendment No. 84 dated 10 July 2025 as the latest listed amendment to these regulations when accessed on 13 November 2026. Recheck the official register and original Gazette text before treating any row as a current compliance determination.

**Important:** An empty \`fssaiAuthorisations\` array means no category-specific authorization was curated into this starter record. It does not mean that the additive is prohibited. Group entries such as BENZOATES and NITRITES are retained as group-based conditions and are not silently converted into universal additive permissions.

### WHO/JECFA

- JECFA database home: https://apps.who.int/food-additives-contaminants-jecfa-database/Home/
- The database states that it includes updates through the 102nd JECFA meeting (June 2026).
- Individual additive records link directly to their JECFA pages. The dataset preserves evaluation years, meeting numbers where verified, group ADI expression basis and population exclusions where given.

### WHO dietary recommendations

- Healthy diet fact sheet, updated 26 January 2026: https://www.who.int/news-room/fact-sheets/detail/healthy-diet
- Saturated and trans-fatty-acid intake guideline (17 July 2023): https://www.who.int/publications/i/item/9789240073630

Each guideline retains the population, jurisdiction, value, unit, denominator/basis and caveats. Adult gram equivalents are not applied to children. Salt and sodium recommendations are represented as separate values in their own units, with the equivalence noted.

## 2. Additive catalogue contents

The starter file contains 15 identities covering preservatives, sweeteners, colours, antioxidants, acidity regulators and flavour enhancers. JECFA entries are not all the same type:

- Individual numeric ADIs use \`numeric\`; only source-defined grouped ADIs use \`group_numeric\` and retain the exact group name and expression basis.
- JECFA's "NOT SPECIFIED" is kept as \`not_specified\`.
- JECFA's "NOT LIMITED" is kept as \`not_limited\`; this required a schema vocabulary extension in Stage 5. It is not numeric and is not converted to zero.
- An ADI is not a measured product concentration and cannot be used as a direct product rating.

FSSAI maximum use levels are category-specific values in mg/kg food or GMP entries. They are not daily intake limits. Notes/caveats are retained with the category entry.

## 3. Dietary guideline catalogue contents

The starter file contains 9 WHO records: free sugars (<10% energy; 5% or less as an additional-benefit target), total fat (≤30% energy for adults), saturated fat (≤10% energy for adults), trans fat (≤1% energy for adults), sodium (<2,000 mg/day for adults), salt (<5 g/day for adults), dietary fibre (≥25 g/day for people older than 10), and combined fruit/vegetable intake (≥400 g/day for people older than 10).

These are whole-diet guidelines. They must not be shown as per-product limits without an explicitly defined and approved translation/scoring method.

## 4. Data interpretation guardrails

1. Presence of an additive in an ingredient list does not disclose its concentration.
2. FSSAI maximum level in food (e.g. mg/kg food), JECFA ADI (mg/kg body weight/day), and WHO whole-diet guidance (e.g. g/day or % energy) are three different quantities.
3. A category-specific FSSAI row cannot be generalized to other food categories.
4. A group ADI is not an individual compound-only ADI. Preserve group name and expression basis.
5. "Not specified" and "not limited" have different source meanings; neither becomes zero.
6. This dataset does not state that an additive is universally good, bad, safe at any quantity, or unsafe because it appears in a label.
7. A numeric product nutrition rating must rely on adequate product-level nutrient information and M3's approved scoring contract.

## 5. Current review states

- 9 additive records with FSSAI category rows are marked `needs_review` because the cited consolidated Appendix A rows and their notes still require cross-check against the original Gazette notifications and any later amendments.
- 6 additive records without curated FSSAI category rows are marked `reviewed` for the cited JECFA source information only; this is not project sign-off or proof of Indian regulatory authorization.
- An empty FSSAI authorization array means no category row was curated in this starter set; it does not mean the additive is prohibited.

## 6. Review needed before production use

- M3/M6 must approve how additive groups map to ingredient mentions and how guideline references are presented in product insights.
- Qualified review must verify each applicable FSSAI authorization against the original Gazette notification, including all numbered notes and any subsequent amendments.
- Verify each JECFA page/evaluation date and group scope again as part of a source-refresh process.
- Decide the dataset refresh policy and whether regulatory change monitoring is required.
- Project owner must approve external-source reuse/retention and the presentation of health information.
