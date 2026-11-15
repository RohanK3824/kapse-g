/**
 * stop_sync.js
 * Sends STOP command to running syncDaemon or kills it cleanly
 */
const net = require('net');

const client = net.createConnection({ port: 49152, host: '127.0.0.1' }, () => {
  client.write('STOP\n');
});

client.on('data', (data) => {
  console.log('✅ Background Sync Daemon stopped successfully.');
  client.end();
  process.exit(0);
});

client.on('error', (err) => {
  console.log('ℹ️ Sync Daemon is not currently running.');
  process.exit(0);
});

setTimeout(() => {
  console.log('Timeout waiting for daemon response.');
  process.exit(0);
}, 2000);
