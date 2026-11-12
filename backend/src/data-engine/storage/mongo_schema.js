'use strict';

const COLLECTION_DEFINITIONS = Object.freeze([
  {
    name: 'products',
    validator: { $jsonSchema: {
      bsonType: 'object', required: ['schemaVersion', 'recordId', 'identifiers', 'sourceRecords', 'quality'],
      properties: {
        schemaVersion: { bsonType: 'string', enum: ['1.0.0'] },
        recordId: { bsonType: 'string', minLength: 1 },
        identifiers: { bsonType: 'object', required: ['gtin'], properties: { gtin: { bsonType: 'object' } } },
        sourceRecords: { bsonType: 'array' },
        quality: { bsonType: 'object' },
      },
    } },
    indexes: [
      { key: { recordId: 1 }, options: { unique: true, name: 'uq_products_record_id' } },
      { key: { 'identifiers.gtin.value': 1 }, options: {
        unique: true, name: 'uq_products_gtin_when_present',
        partialFilterExpression: { 'identifiers.gtin.value': { $type: 'string' } },
      } },
      { key: { updatedAt: -1 }, options: { name: 'ix_products_updated_at' } },
    ],
  },
  {
    name: 'ingredient_aliases',
    validator: { $jsonSchema: {
      bsonType: 'object', required: ['schemaVersion', 'ingredientId', 'canonicalName', 'aliases', 'classification', 'evidence'],
      properties: {
        schemaVersion: { bsonType: 'string', enum: ['1.0.0'] },
        ingredientId: { bsonType: 'string', minLength: 1 },
        canonicalName: { bsonType: 'string', minLength: 1 },
        aliases: { bsonType: 'array' }, classification: { bsonType: 'object' }, evidence: { bsonType: 'array' },
      },
    } },
    indexes: [
      { key: { ingredientId: 1 }, options: { unique: true, name: 'uq_ingredient_alias_id' } },
      { key: { canonicalName: 1 }, options: { name: 'ix_ingredient_canonical_name' } },
      { key: { 'aliases.name': 1 }, options: { name: 'ix_ingredient_alias_name' } },
    ],
  },
  {
    name: 'data_sources',
    validator: { $jsonSchema: {
      bsonType: 'object', required: ['sourceId', 'sourceType', 'extractionMethod', 'retrievedAt'],
      properties: {
        sourceId: { bsonType: 'string', minLength: 1 },
        sourceType: { bsonType: 'string', enum: ['open_food_facts', 'ocr', 'user_correction', 'manual_entry', 'other'] },
        extractionMethod: { bsonType: 'string' },
        retrievedAt: { bsonType: 'string' },
      },
    } },
    indexes: [{ key: { sourceId: 1 }, options: { unique: true, name: 'uq_data_source_id' } }],
  },
]);

async function ensureCollections(db) {
  const existing = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map((item) => item.name));
  for (const definition of COLLECTION_DEFINITIONS) {
    if (!existing.has(definition.name)) {
      await db.createCollection(definition.name, { validator: definition.validator, validationLevel: 'moderate', validationAction: 'error' });
    } else {
      await db.command({ collMod: definition.name, validator: definition.validator, validationLevel: 'moderate', validationAction: 'error' });
    }
    const collection = db.collection(definition.name);
    for (const index of definition.indexes) await collection.createIndex(index.key, index.options);
  }
  return COLLECTION_DEFINITIONS.map(({ name }) => name);
}

module.exports = { COLLECTION_DEFINITIONS, ensureCollections };
