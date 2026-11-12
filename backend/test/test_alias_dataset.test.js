'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const aliases = require('../../data-engineering/ingredient_aliases.json');
const csv = fs.readFileSync(path.resolve(__dirname, '../../data-engineering/ingredient_aliases.csv'), 'utf8').trim().split(/\r?\n/);

test('MVP alias dataset contains 27 unique records and both review states', () => {
  assert.equal(aliases.length, 27);
  assert.equal(new Set(aliases.map((x) => x.ingredientId)).size, aliases.length);
  const statuses = new Set(aliases.map((x) => x.classification.reviewStatus));
  assert.ok(statuses.has('verified'));
  assert.ok(statuses.has('proposed'));
});
test('verified records have evidence; proposed records are not presented as verified', () => {
  for (const entry of aliases) {
    if (entry.classification.reviewStatus === 'verified') assert.ok(entry.evidence.length > 0, entry.ingredientId);
  }
  assert.equal(aliases.filter((x) => x.classification.reviewStatus === 'verified').length, 15);
  assert.equal(aliases.filter((x) => x.classification.reviewStatus === 'proposed').length, 12);
});
test('CSV header and row count align with JSON export', () => {
  assert.match(csv[0], /^ingredientId,canonicalName,/);
  assert.equal(csv.length - 1, aliases.length);
});
test('maltodextrin and dextrin are not classified as simple sugars', () => {
  for (const name of ['maltodextrin', 'dextrin']) {
    const entry = aliases.find((x) => x.canonicalName.toLowerCase() === name);
    assert.ok(entry);
    assert.equal(entry.classification.category, 'starch_or_dextrin');
  }
});
