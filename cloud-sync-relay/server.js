/**
 * Cloud Sync Relay Server
 * Standalone Temporary Cloud Storage Queue for Kapse - G 🔰 Tailor Shop
 * 
 * Can be hosted on Vercel, Render, Railway, Glitch, or any cloud Node.js host.
 * Holds pending customer records temporarily until the tailor shop laptop is turned ON.
 */

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8080;
const SYNC_API_KEY = process.env.SYNC_API_KEY || 'kapse-g-tailor-sync-sec-2026';

app.use(cors());
app.use(express.json());

// In-memory queue (or cloud KV / Redis when configured)
let pendingQueue = [];

// Authentication Middleware
function authenticate(req, res, next) {
  const key = req.headers['x-sync-api-key'] || (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '');
  if (!SYNC_API_KEY || key === SYNC_API_KEY) {
    return next();
  }
  return res.status(401).json({ success: false, message: 'Unauthorized. Invalid x-sync-api-key.' });
}

// Health Check
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    service: 'Kapse - G 🔰 Temporary Cloud Sync Relay',
    pendingRecords: pendingQueue.length,
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', pendingCount: pendingQueue.length });
});

// GET /pending (or /api/sync/pending) - Fetch all pending customer records
const getPendingHandler = (req, res) => {
  res.json({
    success: true,
    count: pendingQueue.length,
    data: pendingQueue
  });
};
app.get('/pending', authenticate, getPendingHandler);
app.get('/api/sync/pending', authenticate, getPendingHandler);

// POST /pending - Add new customer record to temporary queue
const postPendingHandler = (req, res) => {
  const record = req.body;
  if (!record || !record.name || !record.mobile) {
    return res.status(400).json({ success: false, message: 'Name and mobile are required.' });
  }

  const cloudId = record.temp_sync_id || record.id || `cloud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const item = {
    ...record,
    cloudId,
    temp_sync_id: record.temp_sync_id || cloudId,
    queued_at: record.queued_at || new Date().toISOString(),
    sync_status: 'pending'
  };

  // Prevent duplicate insertion in queue
  const exists = pendingQueue.some(q => q.cloudId === cloudId || (q.temp_sync_id && q.temp_sync_id === item.temp_sync_id));
  if (!exists) {
    pendingQueue.push(item);
  }

  res.status(201).json({
    success: true,
    message: 'Record queued in temporary cloud storage.',
    cloudId,
    pendingTotal: pendingQueue.length
  });
};
app.post('/pending', authenticate, postPendingHandler);
app.post('/api/sync/pending', authenticate, postPendingHandler);

// DELETE /pending/:id - Remove record after successful MySQL insertion on laptop
const deletePendingHandler = (req, res) => {
  const id = req.params.id;
  const initialLen = pendingQueue.length;
  pendingQueue = pendingQueue.filter(item => item.cloudId !== id && item.temp_sync_id !== id && item.id !== id);
  const removed = pendingQueue.length < initialLen;

  res.json({
    success: removed,
    message: removed ? 'Temporary cloud copy removed successfully.' : 'Record not found in cloud queue.',
    remainingPending: pendingQueue.length
  });
};
app.delete('/pending/:id', authenticate, deletePendingHandler);
app.delete('/api/sync/pending/:id', authenticate, deletePendingHandler);

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[CloudSyncRelay] Running on port ${PORT}`);
    console.log(`[CloudSyncRelay] API Key Protection: ${SYNC_API_KEY ? 'ENABLED' : 'DISABLED'}`);
  });
}

module.exports = app;
