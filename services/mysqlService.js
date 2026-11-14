const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');
require('dotenv').config();

const DB_SSL = process.env.DB_SSL === 'true' || process.env.DB_SSL === '1';

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'tailor_shop_db',
  waitForConnections: true,
  connectionLimit: 15,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  charset: 'utf8mb4',
  dateStrings: true,
  ...(DB_SSL || (process.env.DB_HOST && process.env.DB_HOST !== 'localhost' && process.env.DB_HOST !== '127.0.0.1') ? {
    ssl: {
      rejectUnauthorized: false
    }
  } : {})
};

// Support DATABASE_URL connection string if provided (e.g. Render / Cloud DB)
if (process.env.DATABASE_URL) {
  try {
    const parsed = new URL(process.env.DATABASE_URL);
    DB_CONFIG.host = parsed.hostname;
    DB_CONFIG.port = parseInt(parsed.port || '3306', 10);
    DB_CONFIG.user = decodeURIComponent(parsed.username);
    DB_CONFIG.password = decodeURIComponent(parsed.password);
    DB_CONFIG.database = parsed.pathname.replace(/^\//, '');
    DB_CONFIG.ssl = { rejectUnauthorized: false };
  } catch (urlErr) {
    console.warn('[MySQL] Failed to parse DATABASE_URL, using individual env vars:', urlErr.message);
  }
}

let pool = null;
let isConnected = false;
let lastConnectionError = null;

/**
 * Initialize Database and Table
 */
async function initDatabase() {
  try {
    // Only attempt CREATE DATABASE if host is localhost
    if (DB_CONFIG.host === 'localhost' || DB_CONFIG.host === '127.0.0.1') {
      try {
        const connection = await mysql.createConnection({
          host: DB_CONFIG.host,
          port: DB_CONFIG.port,
          user: DB_CONFIG.user,
          password: DB_CONFIG.password
        });
        await connection.query(
          `CREATE DATABASE IF NOT EXISTS \`${DB_CONFIG.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
        );
        await connection.end();
      } catch (dbErr) {
        console.warn('[MySQL] Notice: Database auto-create skipped or already exists:', dbErr.message);
      }
    }

    // Step 3: Create connection pool with database selected
    pool = mysql.createPool(DB_CONFIG);

    // Step 4: Create customers table
    const createTableSql = `
      CREATE TABLE IF NOT EXISTS customers (
        id VARCHAR(20) PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        mobile VARCHAR(20) NOT NULL,
        place VARCHAR(255) NOT NULL,
        bill_book VARCHAR(50) NOT NULL,
        page_no VARCHAR(50) NOT NULL,
        date DATE NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_name (name),
        INDEX idx_mobile (mobile),
        INDEX idx_bill_book (bill_book),
        INDEX idx_page_no (page_no)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    await pool.query(createTableSql);

    // Ensure performance indexes for place and date
    try {
      await pool.query('ALTER TABLE customers ADD INDEX idx_date (date)');
    } catch (_) {}
    try {
      await pool.query('ALTER TABLE customers ADD INDEX idx_place (place)');
    } catch (_) {}

    // Safe Schema Upgrades for Automatic Synchronization & Cross-Device Data Entry
    try {
      await pool.query('ALTER TABLE customers MODIFY id VARCHAR(50)');
    } catch (_) {}
    try {
      await pool.query("ALTER TABLE customers ADD COLUMN sync_status VARCHAR(20) DEFAULT 'synced'");
    } catch (_) {}
    try {
      await pool.query('ALTER TABLE customers ADD COLUMN synced_at TIMESTAMP NULL');
    } catch (_) {}
    try {
      await pool.query("ALTER TABLE customers ADD COLUMN device_source VARCHAR(100) DEFAULT 'local'");
    } catch (_) {}
    try {
      await pool.query('ALTER TABLE customers ADD COLUMN temp_sync_id VARCHAR(100) NULL');
    } catch (_) {}
    try {
      await pool.query('ALTER TABLE customers ADD INDEX idx_temp_sync_id (temp_sync_id)');
    } catch (_) {}

    // Create sync_logs table for audit trail and sync status history
    const createSyncLogsSql = `
      CREATE TABLE IF NOT EXISTS sync_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sync_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(20) NOT NULL,
        records_synced INT DEFAULT 0,
        details TEXT,
        device_source VARCHAR(100) DEFAULT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    await pool.query(createSyncLogsSql);

    // Create deleted_customers table for tracking deletions permanently
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS deleted_customers (
          id VARCHAR(50) PRIMARY KEY,
          deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
    } catch (_) {}

    isConnected = true;
    lastConnectionError = null;
    console.log(`[MySQL] Connected successfully to database: ${DB_CONFIG.database}`);

    // Step 5: Check if table has data. If empty, check for migration from customers.xlsx or seed
    const [rows] = await pool.query('SELECT COUNT(*) AS count FROM customers');
    if (rows[0].count === 0) {
      await autoImportOrSeed();
    }

    return true;
  } catch (error) {
    isConnected = false;
    lastConnectionError = error.message;
    console.error(`[MySQL Connection Error]: ${error.message}`);
    console.error(`Please make sure MySQL is running and verify DB_PASSWORD in .env file.`);
    return false;
  }
}

/**
 * Auto-import from existing customers.xlsx or seed default tailor customers
 */
async function autoImportOrSeed() {
  const excelPath = path.join(__dirname, '..', 'customers.xlsx');
  let importedCount = 0;

  if (fs.existsSync(excelPath)) {
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(excelPath);
      const worksheet = workbook.getWorksheet('Customers') || workbook.worksheets[0];

      if (worksheet && worksheet.rowCount > 1) {
        worksheet.eachRow(async (row, rowNumber) => {
          if (rowNumber === 1) return; // skip header
          const id = row.getCell(1).text || String(row.getCell(1).value || '').trim();
          const name = row.getCell(2).text || String(row.getCell(2).value || '').trim();
          const mobile = row.getCell(3).text || String(row.getCell(3).value || '').trim();
          const place = row.getCell(4).text || String(row.getCell(4).value || '').trim();
          const billBook = row.getCell(5).text || String(row.getCell(5).value || '').trim();
          const pageNo = row.getCell(6).text || String(row.getCell(6).value || '').trim();
          let date = row.getCell(7).text || String(row.getCell(7).value || '').trim();
          if (date && date.includes('T')) date = date.split('T')[0];
          const notes = row.getCell(8).text || String(row.getCell(8).value || '').trim();

          if (id && name) {
            await pool.query(
              `INSERT IGNORE INTO customers (id, name, mobile, place, bill_book, page_no, date, notes) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [id, name, mobile, place, billBook, pageNo, date || new Date().toISOString().split('T')[0], notes]
            );
            importedCount++;
          }
        });
        console.log(`[MySQL] Migrated records from customers.xlsx into MySQL database.`);
        return;
      }
    } catch (e) {
      console.warn(`[MySQL] Could not import from customers.xlsx: ${e.message}`);
    }
  }

  // Fallback default sample records
  const today = new Date().toISOString().split('T')[0];
  const sampleRecords = [
    ['CUST-1001', 'Rajesh Sharma', '9876543210', 'Main Bazaar, Shop No. 4', 'B-01', '24', today, '3-Piece Italian Wool Suit (Navy Blue). Chest 40, Waist 34, Length 31.'],
    ['CUST-1002', 'Mohammad Alvi', '9811223344', 'Gandhi Chowk, Sector 2', 'B-01', '48', today, 'Cotton Kurta Pajama set with Mandarin collar and hand-embroidered cuffs.'],
    ['CUST-1003', 'Suresh Patel', '9898761234', 'Station Road, Near Clock Tower', 'B-02', '12', today, '2 Formal Trousers (Charcoal & Olive) and 3 Linen Shirts.'],
    ['CUST-1004', 'Anand Verma', '9765432109', 'Ring Road Market, Flat 3B', 'B-02', '35', today, 'Classic Safari Suit with double breast pockets.']
  ];

  for (const record of sampleRecords) {
    await pool.query(
      `INSERT IGNORE INTO customers (id, name, mobile, place, bill_book, page_no, date, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      record
    );
  }
  console.log(`[MySQL] Seeded ${sampleRecords.length} default sample tailor customers.`);
}

/**
 * Ensure database pool is ready
 */
function ensurePool() {
  if (!pool || !isConnected) {
    throw new Error(
      `MySQL Database is not connected. ${lastConnectionError || 'Please check your MySQL service and .env settings.'}`
    );
  }
  return pool;
}

/**
 * Generate next customer ID
 */
async function generateNextId() {
  const p = ensurePool();
  const [rows] = await p.query('SELECT id FROM customers');
  let maxNum = 1000;
  for (const row of rows) {
    const id = row.id;
    if (typeof id === 'string') {
      const match = id.match(/CUST-(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
  }
  return `CUST-${maxNum + 1}`;
}

/**
 * Get all customers with search and sort
 */
async function getAllCustomers(options = {}) {
  const p = ensurePool();
  const { search, sortBy, order } = options;

  let sql = `
    SELECT id, name, mobile, place, bill_book AS billBook, page_no AS pageNo, 
           DATE_FORMAT(date, '%Y-%m-%d') AS date, notes, created_at, updated_at,
           COALESCE(sync_status, 'synced') AS syncStatus,
           DATE_FORMAT(synced_at, '%Y-%m-%d %H:%i:%s') AS syncedAt,
           COALESCE(device_source, 'local') AS deviceSource,
           temp_sync_id AS tempSyncId
    FROM customers
  `;
  const params = [];

  if (search && String(search).trim() !== '') {
    const term = `%${String(search).trim()}%`;
    sql += `
      WHERE name LIKE ? 
         OR mobile LIKE ? 
         OR bill_book LIKE ? 
         OR page_no LIKE ? 
         OR place LIKE ? 
         OR id LIKE ? 
         OR notes LIKE ?
    `;
    params.push(term, term, term, term, term, term, term);
  }

  const validSortColumns = {
    id: 'id',
    name: 'name',
    mobile: 'mobile',
    place: 'place',
    billBook: 'bill_book',
    pageNo: 'page_no',
    date: 'date'
  };

  const sortCol = validSortColumns[sortBy] || 'created_at';
  const sortDirection = order && order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  sql += ` ORDER BY ${sortCol} ${sortDirection}`;

  const [rows] = await p.query(sql, params);
  return rows;
}

/**
 * Get customer by ID
 */
async function getCustomerById(id) {
  const p = ensurePool();
  const [rows] = await p.query(
    `SELECT id, name, mobile, place, bill_book AS billBook, page_no AS pageNo, 
            DATE_FORMAT(date, '%Y-%m-%d') AS date, notes, created_at, updated_at,
            COALESCE(sync_status, 'synced') AS syncStatus,
            DATE_FORMAT(synced_at, '%Y-%m-%d %H:%i:%s') AS syncedAt,
            COALESCE(device_source, 'local') AS deviceSource,
            temp_sync_id AS tempSyncId
     FROM customers WHERE id = ?`,
    [id]
  );
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Add a new customer
 */
async function addCustomer(data) {
  const p = ensurePool();
  const newId = await generateNextId();
  const dateStr = data.date || new Date().toISOString().split('T')[0];

  const customer = {
    id: newId,
    name: String(data.name || '').trim(),
    mobile: String(data.mobile || '').trim(),
    place: String(data.place || '').trim(),
    billBook: String(data.billBook || '').trim(),
    pageNo: String(data.pageNo || '').trim(),
    date: dateStr,
    notes: String(data.notes || '').trim()
  };

  await p.query(
    `INSERT INTO customers (id, name, mobile, place, bill_book, page_no, date, notes) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [customer.id, customer.name, customer.mobile, customer.place, customer.billBook, customer.pageNo, customer.date, customer.notes]
  );

  return customer;
}

/**
 * Update an existing customer
 */
async function updateCustomer(id, data) {
  const p = ensurePool();
  const existing = await getCustomerById(id);
  if (!existing) return null;

  const updated = {
    name: data.name !== undefined ? String(data.name).trim() : existing.name,
    mobile: data.mobile !== undefined ? String(data.mobile).trim() : existing.mobile,
    place: data.place !== undefined ? String(data.place).trim() : existing.place,
    billBook: data.billBook !== undefined ? String(data.billBook).trim() : existing.billBook,
    pageNo: data.pageNo !== undefined ? String(data.pageNo).trim() : existing.pageNo,
    date: data.date !== undefined ? String(data.date).trim() : existing.date,
    notes: data.notes !== undefined ? String(data.notes).trim() : existing.notes
  };

  await p.query(
    `UPDATE customers 
     SET name = ?, mobile = ?, place = ?, bill_book = ?, page_no = ?, date = ?, notes = ? 
     WHERE id = ?`,
    [updated.name, updated.mobile, updated.place, updated.billBook, updated.pageNo, updated.date, updated.notes, id]
  );

  // If autoCloudSync is active, immediately sync update to Cloud
  try {
    const autoCloudSync = require('./autoCloudSync');
    if (autoCloudSync && autoCloudSync.cloudPool) {
      await autoCloudSync.cloudPool.query(
        `UPDATE customers 
         SET name = ?, mobile = ?, place = ?, bill_book = ?, page_no = ?, date = ?, notes = ? 
         WHERE id = ?`,
        [updated.name, updated.mobile, updated.place, updated.billBook, updated.pageNo, updated.date, updated.notes, id]
      );
    }
  } catch (_) {}

  return { id, ...updated };
}

/**
 * Delete a customer
 */
async function deleteCustomer(id) {
  const p = ensurePool();
  const existing = await getCustomerById(id);
  if (!existing) return null;

  // 1. Delete from local customers table
  await p.query('DELETE FROM customers WHERE id = ?', [id]);

  // 2. Add to deleted_customers table so it never resurrects
  try {
    await p.query('INSERT IGNORE INTO deleted_customers (id) VALUES (?)', [id]);
  } catch (_) {}

  // 3. Delete from TiDB Cloud too if autoCloudSync is active
  try {
    const autoCloudSync = require('./autoCloudSync');
    await autoCloudSync.deleteFromCloud(id);
  } catch (_) {}

  return existing;
}

/**
 * Get statistics for dashboard
 */
async function getStatistics() {
  const p = ensurePool();
  const todayStr = new Date().toISOString().split('T')[0];

  const [totalRows] = await p.query('SELECT COUNT(*) AS total FROM customers');
  const [todayRows] = await p.query('SELECT COUNT(*) AS today FROM customers WHERE date = ?', [todayStr]);
  const [bookRows] = await p.query('SELECT COUNT(DISTINCT bill_book) AS books FROM customers');
  const [placeRows] = await p.query('SELECT COUNT(DISTINCT place) AS places FROM customers');

  return {
    totalCustomers: totalRows[0]?.total || 0,
    todayCustomers: todayRows[0]?.today || 0,
    totalBillBooks: bookRows[0]?.books || 0,
    totalPlaces: placeRows[0]?.places || 0,
    todayDate: todayStr
  };
}

/**
 * Export all MySQL customers to an Excel buffer
 */
async function exportToExcel() {
  const customers = await getAllCustomers({ sortBy: 'id', order: 'asc' });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Kapse - G 🔰 Tailor Shop';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Customers', {
    views: [{ state: 'frozen', ySplit: 1 }]
  });

  worksheet.columns = [
    { header: 'ID', key: 'id', width: 14 },
    { header: 'Customer Name', key: 'name', width: 26 },
    { header: 'Mobile Number', key: 'mobile', width: 18 },
    { header: 'Place', key: 'place', width: 22 },
    { header: 'Bill Book Number', key: 'billBook', width: 18 },
    { header: 'Page Number', key: 'pageNo', width: 14 },
    { header: 'Date', key: 'date', width: 16 },
    { header: 'Notes', key: 'notes', width: 32 }
  ];

  // Header style
  const headerRow = worksheet.getRow(1);
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F2942' } };
    cell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  // Data rows
  customers.forEach((c, idx) => {
    const row = worksheet.addRow([c.id, c.name, c.mobile, c.place, c.billBook, c.pageNo, c.date, c.notes]);
    row.height = 24;
    row.eachCell((cell, col) => {
      cell.font = { name: 'Segoe UI', size: 10 };
      cell.alignment = { vertical: 'middle', horizontal: col === 2 || col === 4 || col === 8 ? 'left' : 'center' };
      if (idx % 2 === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      }
    });
  });

  return workbook.xlsx.writeBuffer();
}

/**
 * Transactional & Idempotent Insertion for Synchronized Customer Records
 * Guarantees:
 * 1. Checks if temp_sync_id or id already exists.
 * 2. Checks if identical record (name, mobile, bill_book, page_no) exists.
 * 3. Never overwrites existing customer records.
 * 4. Inserts with sync_status='synced', synced_at=NOW(), device_source.
 */
async function insertSyncedCustomer(data) {
  const p = ensurePool();
  const conn = await p.getConnection();
  try {
    await conn.beginTransaction();

    const tempSyncId = data.temp_sync_id || data.tempSyncId || null;
    let targetId = data.id;

    // 1. Check if record with this temp_sync_id already exists in MySQL
    if (tempSyncId) {
      const [existingBySyncId] = await conn.query(
        'SELECT id, name, mobile, place, bill_book AS billBook, page_no AS pageNo FROM customers WHERE temp_sync_id = ?',
        [tempSyncId]
      );
      if (existingBySyncId.length > 0) {
        await conn.commit();
        return {
          duplicate: true,
          action: 'skipped',
          reason: 'Record with matching temporary sync ID was already synced previously',
          customer: existingBySyncId[0]
        };
      }
    }

    // 2. Check if a record with the exact same ID already exists
    if (targetId) {
      const [existingById] = await conn.query(
        'SELECT id, name, mobile, place, bill_book AS billBook, page_no AS pageNo FROM customers WHERE id = ?',
        [targetId]
      );
      if (existingById.length > 0) {
        // If an ID exists with different temp_sync_id or no sync id, generate a fresh non-colliding ID
        targetId = await generateNextId();
      }
    } else {
      targetId = await generateNextId();
    }

    // 3. Check for exact duplicate customer entry (same name, mobile, bill_book, page_no)
    const billBook = String(data.billBook || data.bill_book || '').trim();
    const pageNo = String(data.pageNo || data.page_no || '').trim();
    const cleanMobile = String(data.mobile || '').trim();
    const cleanName = String(data.name || '').trim();

    const [existingByContent] = await conn.query(
      'SELECT id, name, mobile, place, bill_book AS billBook, page_no AS pageNo FROM customers WHERE name = ? AND mobile = ? AND bill_book = ? AND page_no = ?',
      [cleanName, cleanMobile, billBook, pageNo]
    );
    if (existingByContent.length > 0) {
      await conn.commit();
      return {
        duplicate: true,
        action: 'skipped',
        reason: 'Duplicate prevented: Customer with identical name, mobile, bill book and page number already exists in MySQL',
        customer: existingByContent[0]
      };
    }

    // 4. Safely insert into MySQL customers table
    const dateStr = data.date || new Date().toISOString().split('T')[0];
    const deviceSource = data.device_source || data.deviceSource || 'remote_device';
    const notes = String(data.notes || '').trim();

    await conn.query(
      `INSERT INTO customers 
       (id, name, mobile, place, bill_book, page_no, date, notes, sync_status, synced_at, device_source, temp_sync_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'synced', NOW(), ?, ?)`,
      [
        targetId,
        cleanName,
        cleanMobile,
        String(data.place || '').trim(),
        billBook,
        pageNo,
        dateStr,
        notes,
        deviceSource,
        tempSyncId
      ]
    );

    await conn.commit();

    return {
      duplicate: false,
      action: 'inserted',
      customer: {
        id: targetId,
        name: cleanName,
        mobile: cleanMobile,
        place: data.place,
        billBook,
        pageNo,
        date: dateStr,
        notes,
        syncStatus: 'synced',
        deviceSource,
        tempSyncId
      }
    };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

/**
 * Add an entry to the sync audit logs table
 */
async function addSyncLog(status, recordsSynced, details, deviceSource = 'system') {
  try {
    const p = ensurePool();
    await p.query(
      'INSERT INTO sync_logs (status, records_synced, details, device_source) VALUES (?, ?, ?, ?)',
      [status, recordsSynced, details, deviceSource]
    );
  } catch (err) {
    console.error('Failed to write sync log:', err.message);
  }
}

/**
 * Retrieve recent sync logs
 */
async function getSyncLogs(limit = 25) {
  try {
    const p = ensurePool();
    const [rows] = await p.query(
      `SELECT id, 
              DATE_FORMAT(sync_time, '%Y-%m-%d %H:%i:%s') AS syncTime, 
              status, 
              records_synced AS recordsSynced, 
              details, 
              device_source AS deviceSource 
       FROM sync_logs 
       ORDER BY id DESC 
       LIMIT ?`,
      [Number(limit) || 25]
    );
    return rows;
  } catch (err) {
    console.error('Failed to fetch sync logs:', err.message);
    return [];
  }
}

/**
 * Get sync summary metrics from MySQL
 */
async function getSyncSummary() {
  try {
    const p = ensurePool();
    const [totalRows] = await p.query('SELECT COUNT(*) AS total FROM customers');
    const [syncedRows] = await p.query("SELECT COUNT(*) AS totalSynced FROM customers WHERE temp_sync_id IS NOT NULL OR sync_status = 'synced'");
    const [lastSyncRows] = await p.query(
      "SELECT DATE_FORMAT(MAX(synced_at), '%Y-%m-%d %H:%i:%s') AS lastSyncedAt FROM customers WHERE synced_at IS NOT NULL"
    );
    const [logCountRows] = await p.query('SELECT COUNT(*) AS totalLogs FROM sync_logs');

    return {
      totalPermanentRecords: totalRows[0]?.total || 0,
      totalSyncedFromRemote: syncedRows[0]?.totalSynced || 0,
      lastSyncedAt: lastSyncRows[0]?.lastSyncedAt || null,
      totalAuditLogs: logCountRows[0]?.totalLogs || 0
    };
  } catch (err) {
    return {
      totalPermanentRecords: 0,
      totalSyncedFromRemote: 0,
      lastSyncedAt: null,
      totalAuditLogs: 0,
      error: err.message
    };
  }
}

/**
 * Get comprehensive database health & status
 */
async function getDatabaseHealth() {
  if (!isConnected || !pool) {
    return {
      status: 'disconnected',
      connected: false,
      error: lastConnectionError || 'Not connected to MySQL'
    };
  }

  try {
    const [statusRows] = await pool.query("SHOW TABLE STATUS LIKE 'customers'");
    const [countRows] = await pool.query('SELECT COUNT(*) AS total FROM customers');
    const tableInfo = statusRows[0] || {};

    return {
      status: 'healthy',
      connected: true,
      database: DB_CONFIG.database,
      table: 'customers',
      totalRecords: countRows[0]?.total || 0,
      engine: tableInfo.Engine || 'InnoDB',
      collation: tableInfo.Collation || 'utf8mb4_unicode_ci',
      host: DB_CONFIG.host,
      port: DB_CONFIG.port,
      user: DB_CONFIG.user,
      error: null
    };
  } catch (err) {
    return {
      status: 'error',
      connected: false,
      error: err.message
    };
  }
}

module.exports = {
  DB_CONFIG,
  initDatabase,
  getAllCustomers,
  getCustomerById,
  addCustomer,
  updateCustomer,
  deleteCustomer,
  getStatistics,
  exportToExcel,
  getDatabaseHealth,
  insertSyncedCustomer,
  addSyncLog,
  getSyncLogs,
  getSyncSummary,
  getPool: () => pool,
  getIsConnected: () => isConnected,
  getLastError: () => lastConnectionError
};
