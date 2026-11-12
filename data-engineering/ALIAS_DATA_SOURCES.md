# Alias Dataset Sources and Evidence Limits

**Review date:** 2026-11-12
**Dataset:** `ingredient_aliases.json`
**Purpose:** Document narrow claims supported by source material and distinguish those claims from project interpretation.

## Sources

| Source | What it supports | What it does not establish |
|---|---|---|
| WHO, Healthy diet — sugars: https://www.who.int/news-room/fact-sheets/detail/healthy-diet | WHO's definition of free sugars includes mono-/disaccharides added by manufacturers/cooks/consumers and sugars naturally present in honey, syrups, fruit juices and concentrates; examples include sucrose, fructose and glucose. | Not an exhaustive ingredient alias list; not an Indian regulatory classification; not a product-level added-sugars calculation. |
| WHO Regional Office for Africa, Sugars factsheet: https://www.afro.who.int/sites/default/files/2019-11/Food_Factsheets_06_EN.pdf | Educational explanation of sugars and examples including honey, malt extract and syrups. | Regional educational material, not an India-specific legal standard. |
| US FDA, Added Sugars on the Nutrition Facts Label: https://www.fda.gov/food/nutrition-facts-label/added-sugars-nutrition-facts-label | US labeling concept and examples of added sugars; distinguishes naturally occurring sugars from some added sources. | Not an Indian FSSAI definition and not automatically transferable to this project's product flags. |
| US FDA, Final Rules to Update the Nutrition Facts Label: https://www.fda.gov/media/98854/download | Examples and terminology such as syrups, brown sugar, high-fructose corn syrup, invert sugar, maltose, trehalose, honey, molasses and sucrose. | Not proof that every entry in this project has an interchangeable name or identical nutritional meaning. |
| EUR-Lex, Commission Regulation (EU) 2017/1017: https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32017R1017 | Narrow identity distinction: dextrin and maltodextrin are starch hydrolysates. | Not an ingredient-use or health claim for packaged foods. |

## Review-state policy

- `verified`: one or more cited sources support the narrow note in the record. This is evidence verification only, not team approval.
- `proposed`: candidate term/synonym needs review against Indian packaged labels and M3/M6 requirements.
- `needs_review`: ambiguous or insufficiently supported entry.
- `rejected`: explicitly excluded after review.

## Conceptual boundaries

1. WHO free sugars and FDA added sugars are related concepts but are not identical regulatory terms.
2. Ingredient-name recognition is different from added-sugar interpretation.
3. Total sugars on a nutrition panel are not equivalent to the sum of aliases in an ingredients list.
4. Maltodextrin/dextrin remain starch-derived ingredients in this dataset; do not collapse them into simple-sugar aliases.
5. No FSSAI threshold or compliance claim is asserted. Obtain official Indian sources and project approval before including such rules.
