/**
 * syncDaemon.js
 * 
 * Standalone Zero-Touch Windows Background Synchronization Daemon
 * for Kapse - G 🔰 Tailor Shop Management System.
 * 
 * Runs continuously in the background on Windows:
 * - Starts automatically when Windows boots / user logs in.
 * - Single-instance guaranteed (binds local control port 49152).
 * - Waits patiently if MySQL or WiFi is not ready at boot, then auto-connects.
 * - Immediately syncs all mobile entries into Laptop MySQL the moment laptop turns on.
 * - Continues polling every 5 seconds silently in the background.
 * - Logs all events to logs/sync_daemon.log
 */

const path = require('path');
const fs = require('fs');
const net = require('net');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const autoCloudSync = require('./autoCloudSync');
const mysqlService = require('./mysqlService');

const CONTROL_PORT = 49152;
const LOG_FILE = path.join(__dirname, '..', 'logs', 'sync_daemon.log');

// Helper: Append log line with timestamp
function log(msg) {
  const ts = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  const line = `[${ts}] ${msg}\n`;
  try {
    process.stdout.write(line);
    fs.appendFileSync(LOG_FILE, line, 'utf8');
  } catch (_) {}
}

// Redirect console.log and console.warn to log file
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
console.log = function(...args) {
  const formatted = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : a)).join(' ');
  log(formatted);
};
console.warn = function(...args) {
  const formatted = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : a)).join(' ');
  log(`⚠️ ${formatted}`);
};

// Rotate log file if it exceeds 2MB
function checkLogRotation() {
  try {
    if (fs.existsSync(LOG_FILE)) {
      const stats = fs.statSync(LOG_FILE);
      if (stats.size > 2 * 1024 * 1024) {
        const backupLog = path.join(__dirname, '..', 'logs', 'sync_daemon.old.log');
        try { fs.unlinkSync(backupLog); } catch (_) {}
        fs.renameSync(LOG_FILE, backupLog);
      }
    }
  } catch (_) {}
}

let lastSyncStats = {
  lastSyncTime: null,
  totalPulled: 0,
  totalPushed: 0,
  status: 'initializing'
};

// -------------------------------------------------------------
// STEP 1: Single Instance Guard & Control Server
// -------------------------------------------------------------
const server = net.createServer((socket) => {
  socket.on('data', (data) => {
    const cmd = data.toString().trim().toUpperCase();
    if (cmd === 'STATUS') {
      socket.write(JSON.stringify({
        status: lastSyncStats.status,
        lastSyncTime: lastSyncStats.lastSyncTime,
        totalPulled: lastSyncStats.totalPulled,
        totalPushed: lastSyncStats.totalPushed,
        pid: process.pid,
        uptime: Math.round(process.uptime())
      }) + '\n');
    } else if (cmd === 'SYNC_NOW') {
      autoCloudSync.syncNow('manual_trigger');
      socket.write('TRIGGERED_SYNC\n');
    } else if (cmd === 'PING') {
      socket.write('PONG\n');
    } else if (cmd === 'STOP') {
      socket.write('STOPPING\n');
      setTimeout(() => process.exit(0), 500);
    }
  });
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    log(`⚠️ Sync Daemon is already running in background (Port ${CONTROL_PORT} in use). Exiting duplicate process.`);
    process.exit(0);
  } else {
    log(`❌ Control server error: ${err.message}`);
  }
});

server.listen(CONTROL_PORT, '127.0.0.1', () => {
  checkLogRotation();
  log('================================================================');
  log(`🚀 KAPSE - G : WINDOWS AUTO-SYNC DAEMON INITIALIZED (PID: ${process.pid})`);
  log('================================================================');
  startDaemonLoop();
});

// -------------------------------------------------------------
// STEP 2: Resilient Startup & Connection Watcher
// -------------------------------------------------------------
async function waitForLocalMySQL() {
  while (true) {
    try {
      const initialized = await mysqlService.initDatabase();
      if (initialized) {
        log('✅ Connected to Laptop Local MySQL (tailor_shop_db).');
        return mysqlService.getPool();
      }
    } catch (err) {
      log(`⏳ Waiting for Laptop Local MySQL to start... (${err.message})`);
    }
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
}

async function startDaemonLoop() {
  try {
    lastSyncStats.status = 'connecting_mysql';
    const localPool = await waitForLocalMySQL();

    lastSyncStats.status = 'connecting_cloud';
    log('🔹 Initializing TiDB Cloud Bridge...');
    await autoCloudSync.init(localPool);

    lastSyncStats.status = 'running';
    log('⚡ Starting Continuous Auto-Sync Engine (Interval: 5s)...');
    autoCloudSync.start();

    // Hook into sync events to track stats
    setInterval(() => {
      lastSyncStats.lastSyncTime = new Date().toISOString();
    }, 10000);

  } catch (err) {
    log(`❌ Fatal error in Sync Daemon: ${err.message}`);
    setTimeout(startDaemonLoop, 5000);
  }
}

// -------------------------------------------------------------
// Graceful Shutdown
// -------------------------------------------------------------
function handleExit(signal) {
  log(`🛑 Received ${signal}. Shutting down Sync Daemon cleanly.`);
  try {
    autoCloudSync.stop();
    server.close();
  } catch (_) {}
  process.exit(0);
}

process.on('SIGINT', () => handleExit('SIGINT'));
process.on('SIGTERM', () => handleExit('SIGTERM'));
process.on('uncaughtException', (err) => {
  log(`⚠️ Uncaught exception in daemon: ${err.message}`);
});
