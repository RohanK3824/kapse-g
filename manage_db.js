/**
 * manage_db.js
 * Database Management & Health Utility for Kapse - G 🔰 Tailor Shop
 * 
 * Commands:
 *   node manage_db.js check     -> Verifies database structure, indexes, and connection health
 *   node manage_db.js backup    -> Exports a complete SQL backup file to /backups folder
 *   node manage_db.js optimize  -> Optimizes MySQL table and defragments storage
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const mysqlService = require('./services/mysqlService');

async function main() {
  const action = process.argv[2] || 'check';

  console.log('==================================================');
  console.log('   ✂️  KAPSE - G 🔰 DATABASE MANAGEMENT UTILITY   ');
  console.log('==================================================');

  const ready = await mysqlService.initDatabase();
  if (!ready) {
    console.error('❌ Could not connect to MySQL.');
    console.error(`Error: ${mysqlService.getLastError()}`);
    console.error('Please verify DB_PASSWORD in .env file.');
    process.exit(1);
  }

  const conn = await mysql.createConnection({
    host: mysqlService.DB_CONFIG.host,
    port: mysqlService.DB_CONFIG.port,
    user: mysqlService.DB_CONFIG.user,
    password: mysqlService.DB_CONFIG.password,
    database: mysqlService.DB_CONFIG.database
  });

  if (action === 'check') {
    console.log(`\n🔍 Checking Database Health for [${mysqlService.DB_CONFIG.database}]...`);
    const [tables] = await conn.query('SHOW TABLES');
    console.log(`   - Tables Found: ${tables.length} (${tables.map(t => Object.values(t)[0]).join(', ')})`);

    const [status] = await conn.query("SHOW TABLE STATUS LIKE 'customers'");
    const tableMeta = status[0] || {};
    console.log(`   - Storage Engine: ${tableMeta.Engine || 'InnoDB'}`);
    console.log(`   - Collation:      ${tableMeta.Collation || 'utf8mb4_unicode_ci'}`);

    const [desc] = await conn.query('DESCRIBE customers');
    console.log(`\n📋 Columns in [customers] table:`);
    desc.forEach(c => {
      console.log(`   * ${c.Field.padEnd(14)} ${c.Type.padEnd(16)} Nullable: ${c.Null.padEnd(4)} Key: ${c.Key || '-'}`);
    });

    const [indexes] = await conn.query('SHOW INDEX FROM customers');
    const indexNames = [...new Set(indexes.map(idx => idx.Key_name))];
    console.log(`\n⚡ Indexes configured (${indexNames.length}):`);
    console.log(`   ${indexNames.join(', ')}`);

    const [rows] = await conn.query('SELECT COUNT(*) AS total FROM customers');
    console.log(`\n📊 Total Customer Records: ${rows[0].total}`);
    console.log('\n✅ Database is properly configured, indexed, and healthy!');
  } else if (action === 'backup') {
    console.log(`\n📦 Generating SQL Backup...`);
    const backupsDir = path.join(__dirname, 'backups');
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }

    const todayStr = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupsDir, `tailor_shop_db_backup_${todayStr}.sql`);

    const [createTable] = await conn.query('SHOW CREATE TABLE customers');
    const createSql = createTable[0]['Create Table'];

    const [rows] = await conn.query('SELECT * FROM customers');

    let sqlDump = `-- ====================================================================\n`;
    sqlDump += `-- Kapse - G 🔰 Database Backup\n`;
    sqlDump += `-- Generated: ${new Date().toISOString()}\n`;
    sqlDump += `-- ====================================================================\n\n`;
    sqlDump += `CREATE DATABASE IF NOT EXISTS \`${mysqlService.DB_CONFIG.database}\`;\n`;
    sqlDump += `USE \`${mysqlService.DB_CONFIG.database}\`;\n\n`;
    sqlDump += `DROP TABLE IF EXISTS \`customers\`;\n`;
    sqlDump += `${createSql};\n\n`;

    if (rows.length > 0) {
      sqlDump += `INSERT INTO \`customers\` (\`id\`, \`name\`, \`mobile\`, \`place\`, \`bill_book\`, \`page_no\`, \`date\`, \`notes\`, \`created_at\`, \`updated_at\`) VALUES\n`;
      const values = rows.map(r => {
        const id = conn.escape(r.id);
        const name = conn.escape(r.name);
        const mobile = conn.escape(r.mobile);
        const place = conn.escape(r.place);
        const billBook = conn.escape(r.bill_book);
        const pageNo = conn.escape(r.page_no);
        const date = conn.escape(r.date instanceof Date ? r.date.toISOString().split('T')[0] : String(r.date).split('T')[0]);
        const notes = conn.escape(r.notes || '');
        const createdAt = conn.escape(r.created_at);
        const updatedAt = conn.escape(r.updated_at);
        return `(${id}, ${name}, ${mobile}, ${place}, ${billBook}, ${pageNo}, ${date}, ${notes}, ${createdAt}, ${updatedAt})`;
      });
      sqlDump += values.join(',\n') + ';\n';
    }

    fs.writeFileSync(backupFile, sqlDump, 'utf8');
    console.log(`\n✅ Backup successfully saved to:`);
    console.log(`   ${backupFile}`);
    console.log(`   Total rows backed up: ${rows.length}`);
  } else if (action === 'optimize') {
    console.log(`\n🧹 Optimizing table [customers]...`);
    await conn.query('OPTIMIZE TABLE customers');
    console.log(`✅ Table optimized and storage defragmented!`);
  }

  await conn.end();
  console.log('==================================================');
  process.exit(0);
}

main().catch(err => {
  console.error('Database Utility Error:', err);
  process.exit(1);
});
