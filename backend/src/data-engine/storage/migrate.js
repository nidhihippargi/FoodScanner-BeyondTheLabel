'use strict';

const { MongoClient } = require('mongodb');
const { loadConfig } = require('../config');
const createCollections = require('./migrations/001_create_collections');
const { seedAliases } = require('./migrations/002_seed_aliases');

async function runMigrations({ config = loadConfig(), MongoClientClass = MongoClient, aliasFilePath } = {}) {
  if (!config.mongoUri) throw new Error('MONGODB_URI is required. Copy backend/.env.example to backend/.env and configure Atlas access.');
  const client = new MongoClientClass(config.mongoUri);
  try {
    await client.connect();
    const db = client.db(config.mongoDbName);
    await createCollections.up(db);
    const seed = await seedAliases(db, { filePath: aliasFilePath });
    return { database: config.mongoDbName, collections: ['products', 'ingredient_aliases', 'data_sources'], aliasesSeeded: seed.count };
  } finally { await client.close(); }
}
if (require.main === module) runMigrations().then((result) => console.log(JSON.stringify(result, null, 2))).catch((error) => { console.error(error.message); process.exitCode = 1; });
module.exports = { runMigrations };
