#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../../');
const jsonFiles = [
  'data-engineering/schemas/product.schema.json',
  'data-engineering/schemas/ingredient.schema.json',
  'data-engineering/ingredient_aliases.json',
  'data-engineering/fixtures/off/product_found.json',
  'data-engineering/fixtures/off/product_incomplete.json',
  'data-engineering/fixtures/off/product_not_found.json',
  'data-engineering/samples/ocr_payload_proposed.json',
  'data-engineering/samples/cleaning_before_after.json',
  'backend/test/fixtures/products/synthetic_product.json',
  'backend/test/fixtures/products/incomplete_product.json',
];
let failed = false;
for (const relative of jsonFiles) {
  try { JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8')); process.stdout.write(`VALID JSON ${relative}\n`); }
  catch (error) { failed = true; process.stderr.write(`INVALID JSON ${relative}: ${error.message}\n`); }
}
if (failed) process.exitCode = 1;
