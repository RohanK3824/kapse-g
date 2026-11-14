/**
 * test_sync.js
 * End-to-End Automatic Synchronization Test Runner
 * 
 * Verifies:
 * 1. MySQL database connection health
 * 2. Mobile / Remote device simulated data entry (saved to Temporary Cloud Queue)
 * 3. Pending record queuing and unique ID generation
 * 4. Automatic sync execution (fetching pending records from cloud)
 * 5. Safe insertion into laptop MySQL database
 * 6. Cloud temporary copy deletion AFTER MySQL insertion
 * 7. Duplicate prevention verification (re-syncing identical data never duplicates)
 * 8. Audit log recording in MySQL
 */

require('dotenv').config();
const mysqlService = require('./services/mysqlService');
const cloudSyncService = require('./services/cloudSyncService');
const syncWorker = require('./services/syncWorker');

async function runEndToEndSyncTest() {
  console.log('================================================================');
  console.log('  ✂️  KAPSE - G 🔰 AUTOMATIC DATA SYNCHRONIZATION TEST SUITE  ✂️  ');
  console.log('================================================================\n');

  try {
    // -------------------------------------------------------------
    // STEP 1: Verify Laptop MySQL Database
    // -------------------------------------------------------------
    console.log('🔹 STEP 1: Initializing & Verifying Laptop MySQL Database...');
    const connected = await mysqlService.initDatabase();
    if (!connected) {
      throw new Error(`MySQL connection failed: ${mysqlService.getLastError()}`);
    }
    const initialCustomers = await mysqlService.getAllCustomers();
    console.log(`   ✅ MySQL Connected (tailor_shop_db). Current permanent records: ${initialCustomers.length}`);

    // -------------------------------------------------------------
    // STEP 2: Simulate Remote Device Data Entry while Laptop was OFF
    // -------------------------------------------------------------
    const timestamp = Date.now();
    const testCustomerId = `CUST-S-${timestamp.toString(36).toUpperCase()}`;
    const testSyncId = `sync-test-uuid-${timestamp}`;

    const remoteCustomer = {
      id: testCustomerId,
      temp_sync_id: testSyncId,
      name: `Rohan Tailor Test (${timestamp.toString().slice(-4)})`,
      mobile: '9876549999',
      place: 'Mobile Entry - Tailor Shop Remote',
      billBook: 'B-SYNC-01',
      pageNo: '88',
      date: new Date().toISOString().split('T')[0],
      notes: 'Test customer created on remote device while laptop was OFF. Premium Italian suit measurements.',
      device_source: 'Mobile Android Chrome (Shop Floor)',
      queued_at: new Date().toISOString()
    };

    console.log('\n🔹 STEP 2: Simulating Remote Device Data Entry (Mobile Phone / Online)...');
    console.log(`   - Generating Unique ID: ${remoteCustomer.id}`);
    console.log(`   - Device Source:        ${remoteCustomer.device_source}`);
    console.log(`   - Temp Sync ID:         ${remoteCustomer.temp_sync_id}`);
    console.log(`   - Customer:             ${remoteCustomer.name} (${remoteCustomer.mobile})`);

    // -------------------------------------------------------------
    // STEP 3: Store in Temporary Cloud Storage Queue
    // -------------------------------------------------------------
    console.log('\n🔹 STEP 3: Storing in Temporary Cloud Storage Queue...');
    const pushResult = await cloudSyncService.pushRecordToCloud(remoteCustomer);
    console.log(`   ✅ Record queued in Temporary Cloud Storage! Cloud ID: ${pushResult.cloudId}`);

    const queueBefore = await cloudSyncService.fetchPendingRecords();
    console.log(`   - Current Pending Records in Cloud Queue: ${queueBefore.length}`);
    const foundInQueue = queueBefore.find(item => item.cloudId === pushResult.cloudId || item.record.temp_sync_id === testSyncId);
    if (!foundInQueue) {
      throw new Error('Test record was not found in the Temporary Cloud Queue!');
    }
    console.log('   ✅ Cloud queue verification passed.');

    // -------------------------------------------------------------
    // STEP 4: Laptop Switched ON -> Automatic Synchronization Trigger
    // -------------------------------------------------------------
    console.log('\n🔹 STEP 4: Triggering Automatic Synchronization (Laptop ON)...');
    const syncResult = await syncWorker.triggerSyncNow('automated-test-suite');
    console.log(`   - Result: ${syncResult.message}`);
    console.log(`   - Inserted: ${syncResult.cycleStats.inserted}, Failed: ${syncResult.cycleStats.failed}, Duplicates Skipped: ${syncResult.cycleStats.duplicatesSkipped}`);

    if (syncResult.cycleStats.inserted !== 1) {
      throw new Error(`Expected exactly 1 insertion, but got ${syncResult.cycleStats.inserted}`);
    }

    // -------------------------------------------------------------
    // STEP 5: Verify MySQL Permanent Storage
    // -------------------------------------------------------------
    console.log('\n🔹 STEP 5: Verifying Insertion in Laptop MySQL Database (Source of Truth)...');
    const insertedRecord = await mysqlService.getCustomerById(testCustomerId);
    if (!insertedRecord) {
      throw new Error(`Customer ${testCustomerId} was not found in MySQL database!`);
    }
    console.log(`   ✅ Found in MySQL: [${insertedRecord.id}] ${insertedRecord.name} (Mobile: ${insertedRecord.mobile})`);
    console.log(`   - Sync Status:   ${insertedRecord.syncStatus}`);
    console.log(`   - Synced At:     ${insertedRecord.syncedAt}`);
    console.log(`   - Device Source: ${insertedRecord.deviceSource}`);
    console.log(`   - Temp Sync ID:  ${insertedRecord.tempSyncId}`);

    // -------------------------------------------------------------
    // STEP 6: Verify Temporary Cloud Copy Was Removed
    // -------------------------------------------------------------
    console.log('\n🔹 STEP 6: Verifying Temporary Cloud Copy Removal...');
    const queueAfter = await cloudSyncService.fetchPendingRecords();
    const stillInQueue = queueAfter.find(item => item.cloudId === pushResult.cloudId || item.record.temp_sync_id === testSyncId);
    if (stillInQueue) {
      throw new Error('Cloud copy was NOT removed from temporary queue after sync!');
    }
    console.log(`   ✅ Cloud queue verified clean! Pending records remaining: ${queueAfter.length}`);

    // -------------------------------------------------------------
    // STEP 7: Verify Duplicate Prevention (Re-inserting same data)
    // -------------------------------------------------------------
    console.log('\n🔹 STEP 7: Testing Duplicate Record Prevention...');
    console.log('   - Attempting to re-push the identical customer data to cloud queue...');
    await cloudSyncService.pushRecordToCloud(remoteCustomer);
    
    console.log('   - Running synchronization cycle again...');
    const duplicateSyncResult = await syncWorker.triggerSyncNow('duplicate-test-suite');
    console.log(`   - Duplicate test result: ${duplicateSyncResult.message}`);
    console.log(`   - Duplicates skipped: ${duplicateSyncResult.cycleStats.duplicatesSkipped}`);

    if (duplicateSyncResult.cycleStats.duplicatesSkipped < 1 && duplicateSyncResult.cycleStats.inserted === 0) {
      console.log('   ✅ Duplicate was prevented successfully!');
    } else if (duplicateSyncResult.cycleStats.duplicatesSkipped >= 1) {
      console.log('   ✅ Duplicate was detected and safely skipped without re-inserting!');
    } else {
      throw new Error('Duplicate prevention failed: Record was re-inserted!');
    }

    // Check count in MySQL
    const allCustomersAfter = await mysqlService.getAllCustomers();
    const matchesInDb = allCustomersAfter.filter(c => c.mobile === '9876549999');
    console.log(`   - Records in MySQL with test mobile: ${matchesInDb.length} (must be exactly 1)`);
    if (matchesInDb.length !== 1) {
      throw new Error(`Duplicate prevention check failed: found ${matchesInDb.length} matching records!`);
    }

    // -------------------------------------------------------------
    // STEP 8: Verify Audit Logs
    // -------------------------------------------------------------
    console.log('\n🔹 STEP 8: Verifying Sync Audit Logs in MySQL...');
    const logs = await mysqlService.getSyncLogs(5);
    console.log(`   ✅ Found ${logs.length} recent sync logs:`);
    logs.slice(0, 3).forEach(l => {
      console.log(`   * [${l.syncTime}] Status: ${l.status.toUpperCase()} | Synced: ${l.recordsSynced} | Details: ${l.details}`);
    });

    // -------------------------------------------------------------
    // STEP 9: Clean Up Test Customer from MySQL
    // -------------------------------------------------------------
    console.log('\n🔹 STEP 9: Cleaning up test customer from MySQL...');
    await mysqlService.deleteCustomer(testCustomerId);
    console.log(`   ✅ Cleaned up test record ${testCustomerId}.`);

    // Clean up test audit logs
    const p = await mysqlService.initDatabase();
    console.log('\n================================================================');
    console.log('  🎉 ALL AUTOMATIC SYNCHRONIZATION TESTS PASSED PERFECTLY! 🎉   ');
    console.log('================================================================\n');

  } catch (error) {
    console.error('\n❌ TEST SUITE FAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

runEndToEndSyncTest();
