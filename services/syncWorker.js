/**
 * syncWorker.js
 * Automatic Synchronization Engine for Kapse - G 🔰 Tailor Shop
 * 
 * Runs in background on the laptop Node.js backend:
 * 1. Automatically polls Temporary Cloud Storage Queue on startup and scheduled intervals.
 * 2. Fetches pending customer records entered on mobile phones or remote devices.
 * 3. Transactionally inserts them into laptop MySQL database.
 * 4. Strictly prevents duplicate records and never overwrites existing customer profiles.
 * 5. Deletes cloud copies ONLY after confirmed MySQL database insertion.
 * 6. Tracks metrics: Total Pending, Successfully Synced, Failed Records, Last Sync Time.
 */

const mysqlService = require('./mysqlService');
const cloudSyncService = require('./cloudSyncService');
require('dotenv').config();

class SyncWorker {
  constructor() {
    this.intervalSeconds = parseInt(process.env.SYNC_INTERVAL_SECONDS || '25', 10);
    this.timer = null;
    this.isSyncing = false;
    this.isRunning = false;

    // Metrics & State
    this.lastSyncTime = null;
    this.lastSyncStatus = 'idle'; // 'idle' | 'syncing' | 'success' | 'warning' | 'error'
    this.lastSyncMessage = 'Waiting for initial synchronization cycle.';
    this.totalSynced = 0;
    this.totalFailed = 0;
    this.totalDuplicatesSkipped = 0;
    this.pendingCount = 0;
    this.consecutiveErrors = 0;
  }

  /**
   * Start the background automatic synchronization worker
   */
  startSyncWorker() {
    if (this.isRunning) return;
    this.isRunning = true;

    console.log('[SyncWorker] Starting Automatic Data Synchronization Worker...');
    console.log(`[SyncWorker] Cloud Storage Provider: [${cloudSyncService.getProvider().toUpperCase()}]`);
    console.log(`[SyncWorker] Auto-Sync Polling Interval: every ${this.intervalSeconds}s`);

    // Run first sync after brief 2-second delay to ensure database connection is established
    setTimeout(() => {
      this.triggerSyncNow('startup-auto-sync');
    }, 2000);

    // Setup recurring interval
    this.timer = setInterval(() => {
      this.triggerSyncNow('interval-auto-sync');
    }, this.intervalSeconds * 1000);
  }

  /**
   * Stop the synchronization worker
   */
  stopSyncWorker() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
    console.log('[SyncWorker] Automatic Data Synchronization Worker stopped.');
  }

  /**
   * Execute an immediate synchronization cycle (cloud queue -> laptop MySQL)
   * @param {string} triggerSource 
   * @returns {Promise<object>}
   */
  async triggerSyncNow(triggerSource = 'manual') {
    if (this.isSyncing) {
      console.log(`[SyncWorker] Sync cycle already in progress (${triggerSource}). Skipping duplicate trigger.`);
      return {
        success: false,
        status: 'busy',
        message: 'A synchronization cycle is already in progress.',
        metrics: this.getStatus()
      };
    }

    this.isSyncing = true;
    this.lastSyncStatus = 'syncing';
    this.lastSyncMessage = `Synchronizing records (${triggerSource})...`;

    const cycleStats = {
      source: triggerSource,
      startTime: new Date(),
      totalFound: 0,
      inserted: 0,
      duplicatesSkipped: 0,
      failed: 0,
      cloudDeletions: 0,
      errors: []
    };

    try {
      // Step 1: Verify MySQL connection
      if (!mysqlService.getIsConnected()) {
        throw new Error('Local MySQL database is not connected. Check DB credentials in .env.');
      }

      // Step 2: Fetch pending records from Temporary Cloud Storage Queue
      const pendingItems = await cloudSyncService.fetchPendingRecords();
      cycleStats.totalFound = pendingItems.length;
      this.pendingCount = pendingItems.length;

      if (pendingItems.length === 0) {
        this.lastSyncTime = new Date().toISOString();
        this.lastSyncStatus = 'success';
        this.lastSyncMessage = 'Everything is in sync. 0 pending records in cloud queue.';
        this.consecutiveErrors = 0;
        this.isSyncing = false;
        return {
          success: true,
          status: 'success',
          message: this.lastSyncMessage,
          metrics: this.getStatus()
        };
      }

      console.log(`[SyncWorker] Found ${pendingItems.length} pending customer record(s) in cloud queue. Processing...`);

      // Step 3: Process each pending record
      for (const item of pendingItems) {
        const { cloudId, record } = item;

        try {
          // Normalize record data
          const customerData = {
            id: record.id,
            name: record.name,
            mobile: record.mobile,
            place: record.place,
            billBook: record.billBook || record.bill_book,
            pageNo: record.pageNo || record.page_no,
            date: record.date || new Date().toISOString().split('T')[0],
            notes: record.notes || '',
            device_source: record.device_source || record.deviceSource || 'remote_web',
            temp_sync_id: record.temp_sync_id || record.tempSyncId || cloudId
          };

          // Step 3a: Transactional insertion with duplicate prevention
          const insertResult = await mysqlService.insertSyncedCustomer(customerData);

          if (insertResult.duplicate) {
            cycleStats.duplicatesSkipped++;
            this.totalDuplicatesSkipped++;
            console.log(`[SyncWorker] ⚠️ Duplicate record skipped: ${customerData.name} (${customerData.mobile}) [${insertResult.reason}]`);

            // Since it's confirmed already in MySQL, safe to clear temporary cloud copy
            await cloudSyncService.deleteCloudRecord(cloudId);
            cycleStats.cloudDeletions++;
          } else {
            cycleStats.inserted++;
            this.totalSynced++;
            console.log(`[SyncWorker] ✅ Inserted into MySQL: [${insertResult.customer.id}] ${insertResult.customer.name} (Book ${insertResult.customer.billBook}/P.${insertResult.customer.pageNo})`);

            // Step 3b: Remove temporary cloud copy ONLY AFTER confirmed MySQL insertion
            const deleted = await cloudSyncService.deleteCloudRecord(cloudId);
            if (deleted) {
              cycleStats.cloudDeletions++;
            }
          }
        } catch (itemErr) {
          cycleStats.failed++;
          this.totalFailed++;
          cycleStats.errors.push({
            cloudId,
            name: record?.name,
            error: itemErr.message
          });
          console.error(`[SyncWorker] ❌ Failed to insert record ${cloudId} (${record?.name}): ${itemErr.message}. Record preserved in cloud for retry.`);
        }
      }

      // Step 4: Re-check remaining pending records
      const remainingItems = await cloudSyncService.fetchPendingRecords();
      this.pendingCount = remainingItems.length;

      this.lastSyncTime = new Date().toISOString();
      this.consecutiveErrors = 0;

      if (cycleStats.failed > 0) {
        this.lastSyncStatus = 'warning';
        this.lastSyncMessage = `Synced ${cycleStats.inserted} record(s), ${cycleStats.duplicatesSkipped} duplicate(s) skipped, ${cycleStats.failed} record(s) failed.`;
      } else {
        this.lastSyncStatus = 'success';
        this.lastSyncMessage = `Successfully synced ${cycleStats.inserted} record(s) into MySQL. (${cycleStats.duplicatesSkipped} duplicates prevented).`;
      }

      // Record in MySQL sync_logs audit table
      await mysqlService.addSyncLog(
        this.lastSyncStatus,
        cycleStats.inserted,
        this.lastSyncMessage,
        triggerSource
      );

      console.log(`[SyncWorker] Sync Cycle Finished: ${this.lastSyncMessage}`);

      return {
        success: cycleStats.failed === 0,
        status: this.lastSyncStatus,
        message: this.lastSyncMessage,
        cycleStats,
        metrics: this.getStatus()
      };
    } catch (err) {
      this.consecutiveErrors++;
      this.totalFailed++;
      this.lastSyncTime = new Date().toISOString();
      this.lastSyncStatus = 'error';
      this.lastSyncMessage = `Synchronization failed: ${err.message}`;

      console.error(`[SyncWorker] ❌ Error during sync cycle: ${err.message}`);

      await mysqlService.addSyncLog('error', 0, `Sync cycle error: ${err.message}`, triggerSource);

      return {
        success: false,
        status: 'error',
        message: this.lastSyncMessage,
        error: err.message,
        metrics: this.getStatus()
      };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Return comprehensive sync status and metrics
   */
  getStatus() {
    return {
      autoSyncActive: this.isRunning,
      isSyncing: this.isSyncing,
      provider: cloudSyncService.getProvider(),
      intervalSeconds: this.intervalSeconds,
      totalPendingRecords: this.pendingCount,
      successfullySyncedRecords: this.totalSynced,
      failedRecords: this.totalFailed,
      duplicatesPrevented: this.totalDuplicatesSkipped,
      lastSyncTime: this.lastSyncTime,
      lastSyncStatus: this.lastSyncStatus,
      lastSyncMessage: this.lastSyncMessage,
      mainDatabase: 'Laptop MySQL (tailor_shop_db)',
      temporaryStorage: `${cloudSyncService.getProvider().toUpperCase()} Cloud Queue`
    };
  }
}

const syncWorker = new SyncWorker();
module.exports = syncWorker;
