/**
 * autoCloudSync.js
 * Real-Time Bidirectional Synchronization between Laptop Local MySQL and TiDB Cloud
 * 
 * Runs continuously in background on Laptop:
 * - When user enters a customer from Mobile -> Automatically pulled into Laptop Local MySQL within seconds!
 * - When user enters a customer on Laptop -> Automatically pushed to Cloud!
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

  init(localPool) {
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

  async syncNow(trigger = 'manual') {
    if (this.isSyncing || !this.cloudPool || !this.localPool) return;
    this.isSyncing = true;

    try {
      // 1. Fetch Cloud customers
      const [cloudRows] = await this.cloudPool.query('SELECT * FROM customers');

      // 2. Insert any new/updated customers from Cloud into Laptop Local MySQL
      let newToLocalCount = 0;
      for (const c of cloudRows) {
        const formattedDate = c.date instanceof Date ? c.date.toISOString().split('T')[0] : c.date;

        const [res] = await this.localPool.query(
          `INSERT INTO customers (id, name, mobile, place, bill_book, page_no, date, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             name = VALUES(name),
             mobile = VALUES(mobile),
             place = VALUES(place),
             bill_book = VALUES(bill_book),
             page_no = VALUES(page_no),
             date = VALUES(date),
             notes = VALUES(notes)`,
          [c.id, c.name, c.mobile, c.place, c.bill_book, c.page_no, formattedDate, c.notes]
        );

        if (res.affectedRows === 1) {
          newToLocalCount++;
          console.log(`[AutoCloudSync] 📲 New Mobile Customer Pulled to Laptop MySQL: [${c.id}] ${c.name} (${c.place})`);
        }
      }

      // 3. Fetch Local customers to check if anything added locally on laptop needs to push to cloud
      const [localRows] = await this.localPool.query('SELECT * FROM customers');
      let newToCloudCount = 0;
      for (const l of localRows) {
        const formattedDate = l.date instanceof Date ? l.date.toISOString().split('T')[0] : l.date;

        const [res] = await this.cloudPool.query(
          `INSERT INTO customers (id, name, mobile, place, bill_book, page_no, date, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             name = VALUES(name),
             mobile = VALUES(mobile),
             place = VALUES(place),
             bill_book = VALUES(bill_book),
             page_no = VALUES(page_no),
             date = VALUES(date),
             notes = VALUES(notes)`,
          [l.id, l.name, l.mobile, l.place, l.bill_book, l.page_no, formattedDate, l.notes]
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
      // Don't crash if network is temporarily lost
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
