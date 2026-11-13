#!/usr/bin/env node
'use strict';

const path = require('node:path');
const fs = require('node:fs');
const { createReferenceRepository } = require('../src/data-engine/reference/reference_repository');

const root = path.resolve(__dirname, '../../');
const dataDir = path.join(root, 'data-engineering');
const repository = createReferenceRepository({ dataDir });
const read = (name) => JSON.parse(fs.readFileSync(path.join(dataDir, name), 'utf8'));
const recordsOf = (value) => Array.isArray(value) ? value : value.records;

const ingredients = recordsOf(read('ingredient_reference.json'));
const compositions = recordsOf(read('nutrient_composition.json'));
const additives = recordsOf(read('additive_reference.json'));
const guidelines = recordsOf(read('dietary_guidelines.json'));
const failures = [];

const ingredientIds = new Set(ingredients.map((record) => record.ingredientId));
const compositionIds = new Set(compositions.map((record) => record.nutrientCompositionId));
const additiveIds = new Set(additives.map((record) => record.additiveId));

for (const ingredient of ingredients) {
  for (const referenceId of ingredient.nutrientCompositionRefs || []) {
    if (!compositionIds.has(referenceId)) failures.push(`Ingredient ${ingredient.ingredientId} references missing nutrient composition ${referenceId}`);
  }
  for (const referenceId of ingredient.additiveRefs || []) {
    if (!additiveIds.has(referenceId)) failures.push(`Ingredient ${ingredient.ingredientId} references missing additive ${referenceId}`);
  }
}
for (const composition of compositions) {
  if (!ingredientIds.has(composition.ingredientId)) failures.push(`Composition ${composition.nutrientCompositionId} references missing ingredient ${composition.ingredientId}`);
}
for (const additive of additives) {
  const evidenceIds = new Set((additive.evidence || []).map((item) => item.evidenceId));
  for (const auth of additive.fssaiAuthorisations || []) {
    for (const evidenceId of auth.evidenceIds || []) if (!evidenceIds.has(evidenceId)) failures.push(`Additive ${additive.additiveId} has unresolved FSSAI evidence ${evidenceId}`);
  }
  for (const evaluation of additive.jecfaEvaluations || []) {
    for (const evidenceId of evaluation.evidenceIds || []) if (!evidenceIds.has(evidenceId)) failures.push(`Additive ${additive.additiveId} has unresolved JECFA evidence ${evidenceId}`);
  }
}
for (const guideline of guidelines) {
  if (!guideline.source || !guideline.source.url || !guideline.population) failures.push(`Guideline ${guideline.guidelineId} is missing its source or population scope`);
}

const summary = repository.getDatasetSummary();
if (failures.length) {
  process.stderr.write(`Ingredient Intelligence validation failed (${failures.length} issue(s)):\n${failures.map((item) => `- ${item}`).join('\n')}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write('Ingredient Intelligence reference validation passed.\n');
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  process.stdout.write('All ingredient composition/additive references and additive evidence links resolve.\n');
}
