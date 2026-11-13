'use strict';

const fs = require('node:fs');
const path = require('node:path');

async function seedAliases(db, { filePath } = {}) {
  const defaultPath = path.resolve(__dirname, '../../../../../data-engineering/ingredient_aliases.json');
  const target = filePath || defaultPath;
  const entries = JSON.parse(fs.readFileSync(target, 'utf8'));
  if (!Array.isArray(entries)) throw new TypeError('Alias dataset must be a JSON array.');
  const collection = db.collection('ingredient_aliases');
  let upserted = 0;
  for (const entry of entries) {
    await collection.updateOne({ ingredientId: entry.ingredientId }, { $set: entry }, { upsert: true });
    upserted += 1;
  }
  return { count: upserted };
}

async function main() {
  const { loadConfig } = require('../../config');
  const { MongoClient } = require('mongodb');
  const config = loadConfig();
  if (!config.mongoUri) throw new Error('MONGODB_URI is required to seed aliases.');
  const client = new MongoClient(config.mongoUri);
  try {
    await client.connect();
    const db = client.db(config.mongoDbName);
    const result = await seedAliases(db);
    process.stdout.write(`Seeded ${result.count} alias records.\n`);
  } finally { await client.close(); }
}
if (require.main === module) main().catch((error) => { console.error(error.message); process.exitCode = 1; });
module.exports = { seedAliases };
