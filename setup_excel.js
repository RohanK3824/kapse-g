/**
 * setup_excel.js
 * Initializes or resets the customers.xlsx database file.
 * 
 * Usage:
 *   node setup_excel.js           -> Ensures customers.xlsx exists with proper columns and styling
 *   node setup_excel.js --fresh   -> Creates a fresh empty customers.xlsx (backs up existing if present)
 */

const fs = require('fs');
const path = require('path');
const excelService = require('./services/excelService');

async function setupExcel() {
  const isFresh = process.argv.includes('--fresh') || process.argv.includes('-f');
  const filePath = excelService.FILE_PATH;

  console.log('==================================================');
  console.log('       ✂️  EXCEL DATABASE SETUP WIZARD  ✂️        ');
  console.log('==================================================');
  console.log(`Target File: ${filePath}`);

  if (fs.existsSync(filePath)) {
    if (isFresh) {
      const backupPath = path.join(__dirname, `customers_backup_${Date.now()}.xlsx`);
      fs.copyFileSync(filePath, backupPath);
      console.log(`Backed up existing database to: ${backupPath}`);
      fs.unlinkSync(filePath);
      console.log('Removed old database file.');
    } else {
      const existing = await excelService.getAllCustomers();
      console.log(`\n✅ Excel database already exists and is active!`);
      console.log(`   - Total Existing Records: ${existing.length}`);
      console.log(`   - Storage Path: ${filePath}`);
      console.log('\nColumn Schema:');
      console.log('   | 1. ID | 2. Customer Name | 3. Mobile Number | 4. Place | 5. Bill Book Number | 6. Page Number | 7. Date | 8. Notes |');
      console.log('\nTip: To create a completely blank fresh database, run:');
      console.log('   node setup_excel.js --fresh');
      console.log('==================================================');
      return;
    }
  }

  // Initialize fresh file
  await excelService.initExcelFile();
  console.log('\n✅ Successfully created fresh Excel database (customers.xlsx)!');
  console.log('   - Sheet Name: Customers');
  console.log('   - Header Row: Navy Blue (#0F2942) with Bold White Font');
  console.log('   - Columns Configured:');
  console.log('     1. ID (e.g. CUST-1001)');
  console.log('     2. Customer Name');
  console.log('     3. Mobile Number');
  console.log('     4. Place / Address');
  console.log('     5. Bill Book Number');
  console.log('     6. Page Number');
  console.log('     7. Date (YYYY-MM-DD)');
  console.log('     8. Notes');
  console.log('   - Gridlines, freeze header row, and cell borders applied.');
  console.log('==================================================');
}

setupExcel().catch(err => {
  console.error('Error setting up Excel database:', err);
  process.exit(1);
});
