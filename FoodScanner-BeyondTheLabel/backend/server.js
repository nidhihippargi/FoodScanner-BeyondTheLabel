'use strict';
const express = require('express');
const cors = require('cors');
const { createRouter } = require('./routes/api');
const ScanLog = require('./models/ScanLog');

function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '2mb' }));
  app.use('/api', createRouter());
  app.use((req, res) => res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: `No route ${req.method} ${req.path}` } }));
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    const bad = err && err.type === 'entity.parse.failed';
    res.status(bad ? 400 : 500).json({ success: false, error: { code: bad ? 'INVALID_JSON' : 'INTERNAL_ERROR', message: err.message } });
  });
  return app;
}

async function start() {
  const db = await ScanLog.connect(process.env.MONGO_URI);
  console.log(`[db] mode=${db.mode}${db.reason ? ` (${db.reason})` : ''}`);
  const port = Number(process.env.PORT) || 5000;
  return createApp().listen(port, '0.0.0.0', () => console.log(`[api] listening on http://0.0.0.0:${port}`));
}

if (require.main === module) start();
module.exports = { createApp, start };
