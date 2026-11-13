'use strict';
const { ensureCollections } = require('../mongo_schema');
async function up(db) { return ensureCollections(db); }
module.exports = { id: '001_create_collections', up };
