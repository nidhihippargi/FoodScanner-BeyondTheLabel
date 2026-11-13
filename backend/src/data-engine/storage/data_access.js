'use strict';

const { ObjectId } = require('mongodb');

class ProductRepository {
  constructor(db) { this.collection = db.collection('products'); }
  async findByRecordId(recordId) { return this.collection.findOne({ recordId }); }
  async findByBarcode(gtin) { return this.collection.findOne({ 'identifiers.gtin.value': String(gtin) }); }
  async save(record) {
    const now = new Date().toISOString();
    const { createdAt, ...rest } = record;
    const document = { ...rest, updatedAt: now };
    await this.collection.updateOne({ recordId: record.recordId }, { $set: document, $setOnInsert: { createdAt: createdAt || now } }, { upsert: true });
    return this.findByRecordId(record.recordId);
  }
  async deleteByRecordId(recordId) { return this.collection.deleteOne({ recordId }); }
}

class IngredientRepository {
  constructor(db) { this.collection = db.collection('ingredient_aliases'); }
  async findById(ingredientId) { return this.collection.findOne({ ingredientId }); }
  async list({ reviewStatus, limit = 100 } = {}) {
    const filter = reviewStatus ? { 'classification.reviewStatus': reviewStatus } : {};
    return this.collection.find(filter).sort({ canonicalName: 1 }).limit(Math.max(1, Math.min(limit, 500))).toArray();
  }
  async upsert(entry) {
    await this.collection.updateOne({ ingredientId: entry.ingredientId }, { $set: entry }, { upsert: true });
    return this.findById(entry.ingredientId);
  }
}

class SourceRepository {
  constructor(db) { this.collection = db.collection('data_sources'); }
  async upsert(sourceRecord) {
    await this.collection.updateOne({ sourceId: sourceRecord.sourceId }, { $set: sourceRecord }, { upsert: true });
    return this.collection.findOne({ sourceId: sourceRecord.sourceId });
  }
}

function createRepositories(db) {
  return { products: new ProductRepository(db), ingredients: new IngredientRepository(db), sources: new SourceRepository(db) };
}

module.exports = { ProductRepository, IngredientRepository, SourceRepository, createRepositories, ObjectId };
