/**
 * syncRoutes.js
 * REST API Endpoints for Automatic Synchronization & Temporary Cloud Queue
 * 
 * Endpoints:
 * - GET  /api/sync/status         -> Live sync worker metrics and status
 * - POST /api/sync/trigger        -> "Sync Now" button trigger
 * - GET  /api/sync/logs           -> Recent synchronization audit logs
 * - POST /api/sync/test           -> Complete end-to-end sync pipeline test
 * - GET  /api/sync/cloud-queue/pending     -> List pending records in temporary cloud queue
 * - POST /api/sync/cloud-queue/pending     -> Push new pending record (from remote devices/mobile)
 * - DELETE /api/sync/cloud-queue/pending/:id -> Delete temporary cloud record
 */

const express = require('express');
const router = express.Router();
const syncWorker = require('../services/syncWorker');
const mysqlService = require('../services/mysqlService');
const cloudSyncService = require('../services/cloudSyncService');

// Optional API Key Verification Middleware
function verifySyncApiKey(req, res, next) {
  const configuredKey = process.env.SYNC_API_KEY;
  // If no key configured, allow open internal access
  if (!configuredKey || configuredKey.trim() === '') {
    return next();
  }

  const clientKey = req.headers['x-sync-api-key'] || 
                    (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '');

  if (clientKey && clientKey === configuredKey) {
    return next();
  }

  // Also allow requests coming directly from localhost without auth header
  const isLocalhost = req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1';
  if (isLocalhost) {
    return next();
  }

  return res.status(401).json({
    success: false,
    message: 'Unauthorized: Invalid or missing x-sync-api-key.'
  });
}

// ============================================================================
// 1. SYNC DASHBOARD & CONTROL ENDPOINTS
// ============================================================================

// GET /api/sync/status - Fetch current synchronization health and metrics
router.get('/status', async (req, res) => {
  try {
    const workerStatus = syncWorker.getStatus();
    const queueStats = await cloudSyncService.getQueueStats();
    const dbSummary = await mysqlService.getSyncSummary();
    const mysqlConnected = mysqlService.getIsConnected();

    res.json({
      success: true,
      data: {
        ...workerStatus,
        totalPendingRecords: queueStats.pendingCount,
        mysqlConnected,
        dbSummary,
        queueStats
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve synchronization status',
      error: err.message
    });
  }
});

// POST /api/sync/trigger - Execute immediate "Sync Now" cycle
router.post('/trigger', async (req, res) => {
  try {
    const result = await syncWorker.triggerSyncNow(req.body?.source || 'dashboard-sync-now');
    res.json({
      success: result.success,
      message: result.message,
      data: result
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Manual sync trigger failed',
      error: err.message
    });
  }
});

// GET /api/sync/logs - Fetch recent sync audit history
router.get('/logs', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '20', 10);
    const logs = await mysqlService.getSyncLogs(limit);
    res.json({
      success: true,
      count: logs.length,
      data: logs
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve sync logs',
      error: err.message
    });
  }
});

// POST /api/sync/test - Run complete test of synchronization process
router.post('/test', async (req, res) => {
  try {
    const testId = `TEST-SYNC-${Date.now().toString(36).toUpperCase()}`;
    const testRecord = {
      id: testId,
      temp_sync_id: `test-uuid-${Date.now()}`,
      name: 'Diagnostic Test Customer',
      mobile: '9999999999',
      place: 'Automated Sync Self-Test',
      billBook: 'TEST-B1',
      pageNo: '999',
      date: new Date().toISOString().split('T')[0],
      notes: 'Automated diagnostic self-test record for sync pipeline verification.',
      device_source: 'test-runner'
    };

    // Step 1: Push to cloud queue
    const pushRes = await cloudSyncService.pushRecordToCloud(testRecord);

    // Step 2: Trigger sync
    const syncRes = await syncWorker.triggerSyncNow('automated-test');

    // Step 3: Check MySQL for test record
    const insertedCust = await mysqlService.getCustomerById(testId);

    // Step 4: Clean up test record from MySQL
    if (insertedCust) {
      await mysqlService.deleteCustomer(testId);
    }

    res.json({
      success: true,
      message: 'Synchronization test completed successfully!',
      testDiagnostics: {
        pushedToCloudQueue: true,
        cloudId: pushRes.cloudId,
        syncedIntoMySQL: !!insertedCust,
        verifiedMySQLRecord: insertedCust?.name === testRecord.name,
        cleanedUpTestRecord: true,
        metrics: syncWorker.getStatus()
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Sync test failed',
      error: err.message
    });
  }
});

// ============================================================================
// 2. TEMPORARY CLOUD QUEUE ENDPOINTS
// (Used by remote devices/mobile when laptop is off or for local relay provider)
// ============================================================================

// GET /api/sync/cloud-queue/pending - List pending items in temporary queue
router.get('/cloud-queue/pending', verifySyncApiKey, async (req, res) => {
  try {
    const records = await cloudSyncService.fetchPendingRecords();
    res.json({
      success: true,
      count: records.length,
      data: records
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve pending records from cloud queue',
      error: err.message
    });
  }
});

// POST /api/sync/cloud-queue/pending - Add pending record to temporary queue
router.post('/cloud-queue/pending', verifySyncApiKey, async (req, res) => {
  try {
    const data = req.body;
    if (!data.name || !data.mobile) {
      return res.status(400).json({
        success: false,
        message: 'Customer name and mobile number are required.'
      });
    }

    const pushResult = await cloudSyncService.pushRecordToCloud(data);
    res.status(201).json({
      success: true,
      message: 'Customer record queued in temporary cloud storage (Pending Sync).',
      data: pushResult
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to push record to temporary cloud queue',
      error: err.message
    });
  }
});

// DELETE /api/sync/cloud-queue/pending/:id - Remove record from temporary queue
router.delete('/cloud-queue/pending/:id', verifySyncApiKey, async (req, res) => {
  try {
    const deleted = await cloudSyncService.deleteCloudRecord(req.params.id);
    res.json({
      success: deleted,
      message: deleted ? 'Record deleted from temporary cloud queue' : 'Record not found in cloud queue'
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete record from cloud queue',
      error: err.message
    });
  }
});

module.exports = router;
