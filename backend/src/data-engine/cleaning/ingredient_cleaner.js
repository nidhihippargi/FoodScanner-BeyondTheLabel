'use strict';

/** Normalize for stable comparisons while retaining the exact original string. This is not alias matching. */
function normalizeIngredientText(rawText) {
  if (rawText === null || rawText === undefined) return { originalText: rawText ?? null, normalizedText: null };
  if (typeof rawText !== 'string') throw new TypeError('Ingredient text must be a string or null.');
  const normalizedText = rawText
    .normalize('NFKC')
    .replace(/[\u2010-\u2015\u2212]/g, '-')
    .replace(/[\u00a0\t\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('en');
  return { originalText: rawText, normalizedText: normalizedText || null };
}

module.exports = { normalizeIngredientText };
