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
      // 1. Synchronize deleted customers list between Local and Cloud
      const [localDeleted] = await this.localPool.query('SELECT id FROM deleted_customers').catch(() => [[]]);
      const [cloudDeleted] = await this.cloudPool.query('SELECT id FROM deleted_customers').catch(() => [[]]);

      const deletedIds = new Set([
        ...localDeleted.map(r => r.id),
        ...cloudDeleted.map(r => r.id)
      ]);

      // Ensure all deleted IDs are purged from both sides
      for (const delId of deletedIds) {
        await this.localPool.query('DELETE FROM customers WHERE id = ?', [delId]).catch(() => {});
        await this.cloudPool.query('DELETE FROM customers WHERE id = ?', [delId]).catch(() => {});
        await this.localPool.query('INSERT IGNORE INTO deleted_customers (id) VALUES (?)', [delId]).catch(() => {});
        await this.cloudPool.query('INSERT IGNORE INTO deleted_customers (id) VALUES (?)', [delId]).catch(() => {});
      }

      // 2. Fetch Cloud customers (excluding deleted ones)
      const [cloudRows] = await this.cloudPool.query('SELECT * FROM customers');
      const activeCloudRows = cloudRows.filter(c => !deletedIds.has(c.id));

      // 3. Insert any new/updated customers from Cloud into Laptop Local MySQL
      let newToLocalCount = 0;
      for (const c of activeCloudRows) {
        const formattedDate = c.date instanceof Date ? c.date.toISOString().split('T')[0] : c.date;
        const totalBill = parseFloat(c.total_bill || 0) || 0;
        const advancePaid = parseFloat(c.advance_paid || 0) || 0;
        const balanceDue = c.balance_due !== undefined ? (parseFloat(c.balance_due) || 0) : Math.max(0, totalBill - advancePaid);

        const [res] = await this.localPool.query(
          `INSERT INTO customers (id, name, mobile, place, bill_book, page_no, date, notes, total_bill, advance_paid, balance_due)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
             balance_due = VALUES(balance_due)`,
          [c.id, c.name, c.mobile, c.place, c.bill_book, c.page_no, formattedDate, c.notes, totalBill, advancePaid, balanceDue]
        );

        if (res.affectedRows === 1) {
          newToLocalCount++;
          console.log(`[AutoCloudSync] 📲 New Mobile Customer Pulled to Laptop MySQL: [${c.id}] ${c.name} (${c.place})`);
        }
      }

      // 4. Fetch Local customers (excluding deleted ones) to push to cloud
      const [localRows] = await this.localPool.query('SELECT * FROM customers');
      const activeLocalRows = localRows.filter(l => !deletedIds.has(l.id));

      let newToCloudCount = 0;
      for (const l of activeLocalRows) {
        const formattedDate = l.date instanceof Date ? l.date.toISOString().split('T')[0] : l.date;
        const totalBill = parseFloat(l.total_bill || 0) || 0;
        const advancePaid = parseFloat(l.advance_paid || 0) || 0;
        const balanceDue = l.balance_due !== undefined ? (parseFloat(l.balance_due) || 0) : Math.max(0, totalBill - advancePaid);

        const [res] = await this.cloudPool.query(
          `INSERT INTO customers (id, name, mobile, place, bill_book, page_no, date, notes, total_bill, advance_paid, balance_due)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
             balance_due = VALUES(balance_due)`,
          [l.id, l.name, l.mobile, l.place, l.bill_book, l.page_no, formattedDate, l.notes, totalBill, advancePaid, balanceDue]
        );

        if (res.affectedRows === 1) {
          newToCloudCount++;
          console.log(`[AutoCloudSync] 💻 Local Laptop Customer Pushed to Cloud: [${l.id}] ${l.name} (${l.place})`);
        }
      }

      if (newToLocalCount > 0 || newToCloudCount > 0) {
        console.log(`[AutoCloudSync] ✅ Sync Completed: ${newToLocalCount} mobile record(s) saved to laptop MySQL, ${newToCloudCount} laptop record(s) sent to cloud.`);
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
