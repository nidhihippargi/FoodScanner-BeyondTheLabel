'use strict';
/** Scan history. Uses MongoDB Atlas via Mongoose when MONGO_URI is set and reachable, else an in-memory array. */
const crypto = require('crypto');
let mongoose = null;
try { mongoose = require('mongoose'); } catch (e) { mongoose = null; }

const memory = [];
let Model = null;
let mode = 'memory';
const MAX_MEMORY = 200;

async function connect(uri) {
  if (!uri || !mongoose) { mode = 'memory'; return { mode, reason: !uri ? 'MONGO_URI not set' : 'mongoose not installed' }; }
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 4000 });
    const schema = new mongoose.Schema({
      scanId: { type: String, index: true }, method: String, barcode: String, productName: String, source: String,
      score: Number, grade: String, product: mongoose.Schema.Types.Mixed, analysis: mongoose.Schema.Types.Mixed,
      createdAt: { type: Date, default: Date.now },
    });
    Model = mongoose.models.ScanLog || mongoose.model('ScanLog', schema);
    mode = 'mongo';
    return { mode };
  } catch (e) {
    mode = 'memory';
    return { mode, reason: e.message };
  }
}

async function save(entry) {
  const doc = { scanId: crypto.randomUUID(), createdAt: new Date().toISOString(), ...entry };
  if (mode === 'mongo' && Model) {
    try { await Model.create(doc); return doc; } catch (e) { mode = 'memory'; }
  }
  memory.unshift(doc);
  if (memory.length > MAX_MEMORY) memory.length = MAX_MEMORY;
  return doc;
}

async function list(limit = 50) {
  if (mode === 'mongo' && Model) {
    try { return (await Model.find({}, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(limit).lean()).map((d) => ({ ...d, createdAt: new Date(d.createdAt).toISOString() })); } catch (e) { mode = 'memory'; }
  }
  return memory.slice(0, limit);
}

async function clear() {
  if (mode === 'mongo' && Model) { try { await Model.deleteMany({}); } catch (e) { mode = 'memory'; } }
  memory.length = 0;
}

module.exports = { connect, save, list, clear, mode: () => mode };
