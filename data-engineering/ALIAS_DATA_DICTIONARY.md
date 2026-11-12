# Alias Data Dictionary

**Dataset files:** `ingredient_aliases.csv`, `ingredient_aliases.json`
**Dataset schema:** `schemas/ingredient.schema.json`
**Version:** 1.0.0 — proposed reference data, subject to M3/M6 review.

| Field | Type | Required | Meaning / rule |
|---|---|---:|---|
| `schemaVersion` | string | Yes | Must match ingredient schema version `1.0.0`. |
| `ingredientId` | string | Yes | Stable, unique identifier within this dataset. |
| `canonicalName` | string | Yes | Human-readable canonical name; not necessarily a legal additive name. |
| `aliases` | array | Yes | Alternative names/spellings/translations; each alias has `name`, nullable `language`, and `aliasType`. |
| `classification.category` | enum | Yes | Narrow reference category: `sugar_or_syrup`, `sugar_alcohol`, `non_sugar_sweetener`, `starch_or_dextrin`, `other_carbohydrate`, `other`, `unclassified`. |
| `classification.reviewStatus` | enum | Yes | `verified`, `proposed`, `needs_review`, or `rejected`. Verified means the cited source supports only the note recorded; it is not project sign-off or Indian legal determination. |
| `classification.reviewNote` | string | No | Scope and ambiguity note. |
| `evidence` | array | Yes | Each evidence record stores source name, publisher, URL, accessed date and what narrow point it supports. A `verified` item must have at least one evidence item. |
| `notes` | string | Yes | Limitations and interpretation notes. |
| `createdAt`, `updatedAt` | date-time | Yes | Dataset record timestamps. |

## Review state at 2026-11-12

The current proposed dataset contains 27 entries: 15 with `verified` evidence status and 12 marked `proposed`. These labels describe evidence review in this file, not project acceptance. Do not use proposed entries as approved detection rules until M3/M6 review.

## Critical distinction

The dataset is a lookup/reference resource only. It does not implement matching, estimate added-sugar amounts, equate an ingredient name with total sugars on a nutrition panel, or produce a health judgement. M3 owns matching and interpretation logic.
