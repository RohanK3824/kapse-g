/**
 * autoCloudSync.js
 * Real-Time Bidirectional Synchronization between Laptop Local MySQL and TiDB Cloud
 * 
 * Runs continuously in background on Laptop:
 * - When user enters a customer from Mobile -> Automatically pulled into Laptop Local MySQL within seconds!
 * - When user enters a customer on Laptop -> Automatically pushed to Cloud!
 * - When user deletes a customer -> Permanently deleted from BOTH Local MySQL & Cloud!
 * - 100% Automatic. Zero queries. Zero commands required from user.
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

function isCustomerEqual(a, b) {
  if (!a || !b) return false;
  const dateA = a.date instanceof Date ? a.date.toISOString().split('T')[0] : String(a.date || '').split('T')[0];
  const dateB = b.date instanceof Date ? b.date.toISOString().split('T')[0] : String(b.date || '').split('T')[0];
  const delivA = a.delivery_date instanceof Date ? a.delivery_date.toISOString().split('T')[0] : (a.delivery_date ? String(a.delivery_date).split('T')[0] : null);
  const delivB = b.delivery_date instanceof Date ? b.delivery_date.toISOString().split('T')[0] : (b.delivery_date ? String(b.delivery_date).split('T')[0] : null);

  return String(a.name || '').trim() === String(b.name || '').trim() &&
         String(a.mobile || '').trim() === String(b.mobile || '').trim() &&
         String(a.place || '').trim() === String(b.place || '').trim() &&
         String(a.bill_book || '').trim() === String(b.bill_book || '').trim() &&
         String(a.page_no || '').trim() === String(b.page_no || '').trim() &&
         dateA === dateB &&
         delivA === delivB &&
         parseFloat(a.total_bill || 0) === parseFloat(b.total_bill || 0) &&
         parseFloat(a.advance_paid || 0) === parseFloat(b.advance_paid || 0) &&
         parseFloat(a.balance_due || 0) === parseFloat(b.balance_due || 0) &&
         String(a.notes || '').trim() === String(b.notes || '').trim();
}

class AutoCloudSync {
  constructor() {
    this.cloudPool = null;
    this.localPool = null;
    this.intervalTimer = null;
    this.isSyncing = false;
    this.intervalMs = parseInt(process.env.AUTO_SYNC_INTERVAL_MS || '5000', 10);
    this.enabled = process.env.AUTO_SYNC_ENABLED !== 'false';
  }

  async init(localPool) {
    this.localPool = localPool;

    const cloudHost = process.env.CLOUD_DB_HOST || 'gateway01.ap-northeast-1.prod.aws.tidbcloud.com';
    const cloudUser = process.env.CLOUD_DB_USER || '2rxCpfHbPgRMNEP.root';
    const cloudPass = process.env.CLOUD_DB_PASSWORD || 'zT3IjAWjwlkTuBa4';
    const cloudDb = process.env.CLOUD_DB_NAME || 'kapse_db';
    const cloudPort = parseInt(process.env.CLOUD_DB_PORT || '4000', 10);

    try {
      this.cloudPool = mysql.createPool({
        host: cloudHost,
        port: cloudPort,
        user: cloudUser,
        password: cloudPass,
        database: cloudDb,
        waitForConnections: true,
        connectionLimit: 5,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 10000,
        charset: 'utf8mb4',
        dateStrings: true,
        ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true }
      });

      // Ensure deleted_customers table exists on TiDB Cloud
      try {
        await this.cloudPool.query(`
          CREATE TABLE IF NOT EXISTS deleted_customers (
            id VARCHAR(50) PRIMARY KEY,
            deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `);
      } catch (_) {}

      console.log('[AutoCloudSync] TiDB Cloud synchronization bridge initialized.');
    } catch (err) {
      console.warn('[AutoCloudSync] Could not initialize cloud pool:', err.message);
    }
  }

  start() {
    if (!this.enabled || !this.cloudPool || !this.localPool) return;

    console.log(`[AutoCloudSync] Live Auto-Sync ACTIVE: Polling every ${this.intervalMs / 1000}s`);

    // Run first sync immediately after 2 seconds
    setTimeout(() => {
      this.syncNow('startup');
    }, 2000);

    // Schedule regular polling
    this.intervalTimer = setInterval(() => {
      this.syncNow('interval');
    }, this.intervalMs);
  }

  stop() {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
  }

  /**
   * Permanently delete a customer from TiDB Cloud
   */
  async deleteFromCloud(id) {
    if (!this.cloudPool) return;
    try {
      await this.cloudPool.query('DELETE FROM customers WHERE id = ?', [id]);
      await this.cloudPool.query('INSERT IGNORE INTO deleted_customers (id) VALUES (?)', [id]);
      console.log(`[AutoCloudSync] 🗑️ Deleted [${id}] permanently from TiDB Cloud`);
    } catch (err) {
      console.warn('[AutoCloudSync] Could not delete from cloud:', err.message);
    }
  }

  async syncNow(trigger = 'manual') {
    if (this.isSyncing || !this.cloudPool || !this.localPool) return;
    this.isSyncing = true;

    try {
      // 1. Synchronize deleted customers list safely between Local and Cloud
      const [localDeleted] = await this.localPool.query('SELECT id FROM deleted_customers').catch(() => [[]]);
      const [cloudDeleted] = await this.cloudPool.query('SELECT id FROM deleted_customers').catch(() => [[]]);

      const localDelSet = new Set((localDeleted || []).map(r => r.id));
      const cloudDelSet = new Set((cloudDeleted || []).map(r => r.id));

      // Any customer ID marked as deleted on EITHER side is a permanent deletion!
      const allDeletedIds = new Set([...localDelSet, ...cloudDelSet]);

      // Purge all deleted customers from both Local and Cloud tables,
      // and ensure the deletion tombstone is recorded on both sides
      for (const delId of allDeletedIds) {
        await this.localPool.query('DELETE FROM customers WHERE id = ?', [delId]).catch(() => {});
        await this.cloudPool.query('DELETE FROM customers WHERE id = ?', [delId]).catch(() => {});
        await this.localPool.query('INSERT IGNORE INTO deleted_customers (id) VALUES (?)', [delId]).catch(() => {});
        await this.cloudPool.query('INSERT IGNORE INTO deleted_customers (id) VALUES (?)', [delId]).catch(() => {});
      }

      // 2. Fetch current active records from both sides
      const [cloudRows] = await this.cloudPool.query('SELECT * FROM customers');
      const [localRows] = await this.localPool.query('SELECT * FROM customers');

      const activeCloudRows = cloudRows.filter(c => !allDeletedIds.has(c.id));
      const activeLocalRows = localRows.filter(l => !allDeletedIds.has(l.id));

      const localMap = new Map(activeLocalRows.map(r => [r.id, r]));
      const cloudMap = new Map(activeCloudRows.map(r => [r.id, r]));

      // 3. Pull new or updated records from Cloud to Laptop Local MySQL
      let newToLocalCount = 0;
      for (const c of activeCloudRows) {
        const localRec = localMap.get(c.id);

        // Skip if local already has identical record
        if (localRec && isCustomerEqual(localRec, c)) {
          continue;
        }

        const formattedDate = c.date instanceof Date ? c.date.toISOString().split('T')[0] : c.date;
        const formattedDeliveryDate = c.delivery_date instanceof Date ? c.delivery_date.toISOString().split('T')[0] : (c.delivery_date || null);
        const totalBill = parseFloat(c.total_bill || 0) || 0;
        const advancePaid = parseFloat(c.advance_paid || 0) || 0;
        const balanceDue = c.balance_due !== undefined ? (parseFloat(c.balance_due) || 0) : Math.max(0, totalBill - advancePaid);

        await this.localPool.query(
          `INSERT INTO customers (id, name, mobile, place, bill_book, page_no, date, notes, total_bill, advance_paid, balance_due, delivery_date)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             name = VALUES(name),
             mobile = VALUES(mobile),
             place = VALUES(place),
             bill_book = VALUES(bill_book),
             page_no = VALUES(page_no),
             date = VALUES(date),
             notes = VALUES(notes),
             total_bill = VALUES(total_bill),
             advance_paid = VALUES(advance_paid),
             balance_due = VALUES(balance_due),
             delivery_date = VALUES(delivery_date)`,
          [c.id, c.name, c.mobile, c.place, c.bill_book, c.page_no, formattedDate, c.notes, totalBill, advancePaid, balanceDue, formattedDeliveryDate]
        );

        newToLocalCount++;
        const actionLabel = localRec ? 'Updated' : 'New';
        console.log(`[AutoCloudSync] 📲 ${actionLabel} Mobile Customer Pulled to Laptop MySQL: [${c.id}] ${c.name} (${c.place})`);
      }

      // 4. Push new or updated records from Laptop to Cloud
      let newToCloudCount = 0;
      for (const l of activeLocalRows) {
        const cloudRec = cloudMap.get(l.id);

        // Skip if cloud already has identical record
        if (cloudRec && isCustomerEqual(cloudRec, l)) {
          continue;
        }

        const formattedDate = l.date instanceof Date ? l.date.toISOString().split('T')[0] : l.date;
        const formattedDeliveryDate = l.delivery_date instanceof Date ? l.delivery_date.toISOString().split('T')[0] : (l.delivery_date || null);
        const totalBill = parseFloat(l.total_bill || 0) || 0;
        const advancePaid = parseFloat(l.advance_paid || 0) || 0;
        const balanceDue = l.balance_due !== undefined ? (parseFloat(l.balance_due) || 0) : Math.max(0, totalBill - advancePaid);

        await this.cloudPool.query(
          `INSERT INTO customers (id, name, mobile, place, bill_book, page_no, date, notes, total_bill, advance_paid, balance_due, delivery_date)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             name = VALUES(name),
             mobile = VALUES(mobile),
             place = VALUES(place),
             bill_book = VALUES(bill_book),
             page_no = VALUES(page_no),
             date = VALUES(date),
             notes = VALUES(notes),
             total_bill = VALUES(total_bill),
             advance_paid = VALUES(advance_paid),
             balance_due = VALUES(balance_due),
             delivery_date = VALUES(delivery_date)`,
          [l.id, l.name, l.mobile, l.place, l.bill_book, l.page_no, formattedDate, l.notes, totalBill, advancePaid, balanceDue, formattedDeliveryDate]
        );

        newToCloudCount++;
        const actionLabel = cloudRec ? 'Updated' : 'New';
        console.log(`[AutoCloudSync] 💻 ${actionLabel} Local Laptop Customer Pushed to Cloud: [${l.id}] ${l.name} (${l.place})`);
      }

      if (newToLocalCount > 0 || newToCloudCount > 0) {
        console.log(`[AutoCloudSync] ✅ Sync Completed: ${newToLocalCount} pulled to laptop, ${newToCloudCount} pushed to cloud.`);
      }
    } catch (err) {
      if (trigger !== 'interval') {
        console.warn(`[AutoCloudSync] Sync notice: ${err.message}`);
      }
    } finally {
      this.isSyncing = false;
    }
  }
}

const autoCloudSync = new AutoCloudSync();
module.exports = autoCloudSync;
