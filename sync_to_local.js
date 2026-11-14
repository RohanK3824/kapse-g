/**
 * sync_to_local.js
 * Pulls all customer records from TiDB Cloud directly into Laptop's Local MySQL (tailor_shop_db)
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

const CLOUD_CONFIG = {
  host: process.env.CLOUD_DB_HOST || 'gateway01.ap-northeast-1.prod.aws.tidbcloud.com',
  port: parseInt(process.env.CLOUD_DB_PORT || '4000', 10),
  user: process.env.CLOUD_DB_USER || '2rxCpfHbPgRMNEP.root',
  password: process.env.CLOUD_DB_PASSWORD || 'zT3IjAWjwlkTuBa4',
  database: process.env.CLOUD_DB_NAME || 'kapse_db',
  ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true }
};

const LOCAL_CONFIG = {
  host: 'localhost',
  port: 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '3824',
  database: 'tailor_shop_db'
};

async function syncToLocal() {
  console.log('==================================================');
  console.log(' 🔄 KAPSE - G : PULL CLOUD DATA TO LAPTOP MYSQL   ');
  console.log('==================================================');

  let cloudConn = null;
  let localConn = null;

  try {
    console.log('1. Connecting to TiDB Cloud Database...');
    cloudConn = await mysql.createConnection(CLOUD_CONFIG);
    const [cloudRows] = await cloudConn.query('SELECT * FROM customers ORDER BY id ASC');
    console.log(`   Found ${cloudRows.length} total customer record(s) on TiDB Cloud.`);

    console.log('2. Connecting to Laptop Local MySQL (tailor_shop_db)...');
    localConn = await mysql.createConnection(LOCAL_CONFIG);

    let inserted = 0;
    let updated = 0;

    for (const c of cloudRows) {
      const formattedDate = c.date instanceof Date ? c.date.toISOString().split('T')[0] : c.date;

      const [res] = await localConn.query(
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
        inserted++;
      } else if (res.affectedRows === 2) {
        updated++;
      }
    }

    console.log('==================================================');
    console.log(`✅ Synchronization Complete!`);
    console.log(`   - New Customers Saved to Laptop: ${inserted}`);
    console.log(`   - Existing Customers Updated:   ${updated}`);
    console.log(`   - Total in Laptop Local MySQL:   ${cloudRows.length}`);
    console.log('==================================================');

  } catch (err) {
    console.error('❌ Sync failed:', err.message);
  } finally {
    if (cloudConn) await cloudConn.end();
    if (localConn) await localConn.end();
  }
}

syncToLocal();
