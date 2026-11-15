/**
 * status_sync.js
 * Queries syncDaemon and compares Local MySQL vs TiDB Cloud counts
 */
const net = require('net');
const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function checkStatus() {
  console.log('================================================================');
  console.log('  ✂️  KAPSE - G 🔰 LIVE BACKGROUND AUTO-SYNC STATUS CHECK  ✂️   ');
  console.log('================================================================');

  // Check 1: Daemon connection
  await new Promise((resolve) => {
    const client = net.createConnection({ port: 49152, host: '127.0.0.1' }, () => {
      client.write('STATUS\n');
    });

    client.on('data', (d) => {
      try {
        const info = JSON.parse(d.toString().trim());
        console.log('🟢 Background Windows Sync Service: ACTIVE & RUNNING');
        console.log(`   - Process ID (PID):    ${info.pid}`);
        console.log(`   - Daemon Uptime:       ${Math.floor(info.uptime / 60)} min ${info.uptime % 60} sec`);
        console.log(`   - Engine Status:       ${info.status}`);
        console.log(`   - Last Heartbeat/Sync: ${info.lastSyncTime || 'Just started'}`);
      } catch (_) {
        console.log('🟢 Background Service: ACTIVE');
      }
      client.end();
      resolve();
    });

    client.on('error', () => {
      console.log('🟡 Background Windows Sync Service: NOT RUNNING');
      console.log('   (Start it anytime with start_sync_silent.vbs or manage_sync.bat)');
      resolve();
    });

    setTimeout(resolve, 1500);
  });

  // Check 2: Database counts
  try {
    const localConn = await mysql.createConnection({
      host: 'localhost',
      port: 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '3824',
      database: 'tailor_shop_db'
    });
    const [localRes] = await localConn.query('SELECT count(*) as count FROM customers');
    console.log(`\n📦 Local Laptop MySQL (tailor_shop_db): ${localRes[0].count} customers`);
    await localConn.end();
  } catch (err) {
    console.log(`\n❌ Local MySQL check failed: ${err.message}`);
  }

  try {
    const cloudConn = await mysql.createConnection({
      host: process.env.CLOUD_DB_HOST || 'gateway01.ap-northeast-1.prod.aws.tidbcloud.com',
      port: parseInt(process.env.CLOUD_DB_PORT || '4000', 10),
      user: process.env.CLOUD_DB_USER || '2rxCpfHbPgRMNEP.root',
      password: process.env.CLOUD_DB_PASSWORD || 'zT3IjAWjwlkTuBa4',
      database: process.env.CLOUD_DB_NAME || 'kapse_db',
      ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true }
    });
    const [cloudRes] = await cloudConn.query('SELECT count(*) as count FROM customers');
    console.log(`☁️  TiDB Cloud (Mobile Database):       ${cloudRes[0].count} customers`);
    await cloudConn.end();
  } catch (err) {
    console.log(`☁️  TiDB Cloud check failed: ${err.message}`);
  }

  console.log('================================================================');
}

checkStatus();
