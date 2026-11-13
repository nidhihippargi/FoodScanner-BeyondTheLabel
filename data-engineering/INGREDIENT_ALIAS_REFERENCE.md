# Ingredient Alias Reference — MVP Candidate Dataset

**Dataset size:** 27 entries
**Review state:** 15 evidence-reviewed / 12 proposed
**Version:** 1.0.0 — draft for M3/M6 approval, not a final regulatory classification.

## How to use this file

Each entry is represented in `ingredient_aliases.json` and `.csv`. Read `classification.reviewStatus` and the individual evidence record before relying on an entry. `verified` means its source supports the narrow name/category note; it does not mean that a project owner has approved an alias-matching rule or that it is an Indian regulatory conclusion.

The dataset intentionally includes distinct groups:

- Simple sugars and disaccharides (for example sucrose, glucose, fructose, lactose, maltose and trehalose).
- Syrups and concentrated sweetening ingredients (for example glucose syrup, invert sugar syrup, rice syrup and molasses).
- Ingredient forms that need contextual handling (for example malt extract and date syrup).
- Starch-derived ingredients (maltodextrin and dextrin), kept in `starch_or_dextrin` rather than treated as synonyms for simple sugars.

## Evidence boundaries

WHO's free-sugars definition includes mono-/disaccharides added to foods and sugars naturally present in honey, syrups and fruit juices/concentrates. FDA's added-sugars labeling resources are US-specific. The EU feed-material catalogue is used only for the narrow distinction between dextrin/maltodextrin and simple sugars. None of these sources is an Indian FSSAI rule for this app.

## Dataset list

The authoritative fields and source details are in the machine-readable records. The CSV is a flat export intended for review and spreadsheet inspection. Alias matching algorithms are explicitly out of scope for the Data Engine dataset stage.

## Pending project review

- M3: confirm useful categories, aliases and what should be considered a match candidate.
- M6: confirm schema compatibility and field vocabulary.
- Project owner: approve the final MVP subset before it is used in analysis.
- If FSSAI-specific language is required, research and cite the current official Indian material separately before making a compliance claim.
