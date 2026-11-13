const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

const FILE_PATH = path.join(__dirname, '..', 'customers.xlsx');
const SHEET_NAME = 'Customers';

// Columns definition according to requirements:
// | ID | Customer Name | Mobile Number | Place | Bill Book Number | Page Number | Date | Notes |
const COLUMNS = [
  { header: 'ID', key: 'id', width: 14 },
  { header: 'Customer Name', key: 'name', width: 26 },
  { header: 'Mobile Number', key: 'mobile', width: 18 },
  { header: 'Place', key: 'place', width: 22 },
  { header: 'Bill Book Number', key: 'billBook', width: 18 },
  { header: 'Page Number', key: 'pageNo', width: 14 },
  { header: 'Date', key: 'date', width: 16 },
  { header: 'Notes', key: 'notes', width: 32 }
];

// Async lock queue to guarantee sequential file access and prevent corruption
let queue = Promise.resolve();
function executeLocked(fn) {
  const result = queue.then(() => fn(), () => fn());
  queue = result.catch(() => {});
  return result;
}

// Styling helper for header row
function applyHeaderStyles(worksheet) {
  const headerRow = worksheet.getRow(1);
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F2942' } // Navy blue
    };
    cell.font = {
      name: 'Segoe UI',
      size: 11,
      bold: true,
      color: { argb: 'FFFFFFFF' } // White
    };
    cell.alignment = {
      vertical: 'middle',
      horizontal: 'center',
      wrapText: true
    };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF0B1E31' } },
      left: { style: 'thin', color: { argb: 'FF0B1E31' } },
      bottom: { style: 'medium', color: { argb: 'FF0B1E31' } },
      right: { style: 'thin', color: { argb: 'FF0B1E31' } }
    };
  });
}

// Styling helper for data rows
function applyRowStyles(row, isEven = false) {
  row.height = 24;
  row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    cell.font = { name: 'Segoe UI', size: 10, color: { argb: 'FF1F2937' } };
    cell.alignment = {
      vertical: 'middle',
      horizontal: colNumber === 1 || colNumber === 3 || colNumber === 5 || colNumber === 6 || colNumber === 7 ? 'center' : 'left',
      wrapText: colNumber === 8
    };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
    };
    if (isEven) {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF8FAFC' }
      };
    }
  });
}

// Ensure the Excel file exists; if not, create it
async function initExcelFile() {
  return executeLocked(async () => {
    if (!fs.existsSync(FILE_PATH)) {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Tailor Shop Customer Management';
      workbook.created = new Date();
      workbook.modified = new Date();

      const worksheet = workbook.addWorksheet(SHEET_NAME, {
        views: [{ state: 'frozen', ySplit: 1 }]
      });

      worksheet.columns = COLUMNS;
      applyHeaderStyles(worksheet);

      await workbook.xlsx.writeFile(FILE_PATH);
      console.log(`Initialized fresh Excel database at: ${FILE_PATH}`);
    }
  });
}

// Normalize cell value to string
function formatCellValue(val) {
  if (val === null || val === undefined) return '';
  if (val instanceof Date) {
    return val.toISOString().split('T')[0];
  }
  if (typeof val === 'object' && val.text) {
    return String(val.text).trim();
  }
  if (typeof val === 'object' && val.result !== undefined) {
    return String(val.result).trim();
  }
  return String(val).trim();
}

// Generate the next unique customer ID (e.g. CUST-1001)
function generateNextId(existingIds) {
  let maxNum = 1000;
  for (const id of existingIds) {
    if (typeof id === 'string') {
      const match = id.match(/CUST-(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      } else {
        const num = parseInt(id, 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    } else if (typeof id === 'number' && id > maxNum) {
      maxNum = id;
    }
  }
  return `CUST-${maxNum + 1}`;
}

// Load workbook safely
async function loadWorkbook() {
  if (!fs.existsSync(FILE_PATH)) {
    await initExcelFile();
  }
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(FILE_PATH);
  let worksheet = workbook.getWorksheet(SHEET_NAME) || workbook.worksheets[0];
  if (!worksheet) {
    worksheet = workbook.addWorksheet(SHEET_NAME, {
      views: [{ state: 'frozen', ySplit: 1 }]
    });
    worksheet.columns = COLUMNS;
    applyHeaderStyles(worksheet);
  }
  return { workbook, worksheet };
}

// Fetch all customers directly from Excel
async function getAllCustomers() {
  return executeLocked(async () => {
    const { worksheet } = await loadWorkbook();
    const customers = [];

    // Header is row 1, data starts from row 2
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // skip header
      const id = formatCellValue(row.getCell(1).value);
      if (!id) return; // skip empty rows

      customers.push({
        id: id,
        name: formatCellValue(row.getCell(2).value),
        mobile: formatCellValue(row.getCell(3).value),
        place: formatCellValue(row.getCell(4).value),
        billBook: formatCellValue(row.getCell(5).value),
        pageNo: formatCellValue(row.getCell(6).value),
        date: formatCellValue(row.getCell(7).value),
        notes: formatCellValue(row.getCell(8).value)
      });
    });

    return customers;
  });
}

// Fetch single customer by ID
async function getCustomerById(customerId) {
  return executeLocked(async () => {
    const { worksheet } = await loadWorkbook();
    const targetId = String(customerId).trim().toUpperCase();

    let found = null;
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const id = formatCellValue(row.getCell(1).value);
      if (id.toUpperCase() === targetId) {
        found = {
          id: id,
          name: formatCellValue(row.getCell(2).value),
          mobile: formatCellValue(row.getCell(3).value),
          place: formatCellValue(row.getCell(4).value),
          billBook: formatCellValue(row.getCell(5).value),
          pageNo: formatCellValue(row.getCell(6).value),
          date: formatCellValue(row.getCell(7).value),
          notes: formatCellValue(row.getCell(8).value)
        };
      }
    });

    return found;
  });
}

// Add a new customer
async function addCustomer(customerData) {
  return executeLocked(async () => {
    const { workbook, worksheet } = await loadWorkbook();

    // Collect existing IDs to avoid duplicates and auto-generate next ID
    const existingIds = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const id = formatCellValue(row.getCell(1).value);
      if (id) existingIds.push(id);
    });

    const newId = generateNextId(existingIds);
    const dateStr = customerData.date || new Date().toISOString().split('T')[0];

    const newCustomer = {
      id: newId,
      name: String(customerData.name || '').trim(),
      mobile: String(customerData.mobile || '').trim(),
      place: String(customerData.place || '').trim(),
      billBook: String(customerData.billBook || '').trim(),
      pageNo: String(customerData.pageNo || '').trim(),
      date: dateStr,
      notes: String(customerData.notes || '').trim()
    };

    const newRow = worksheet.addRow([
      newCustomer.id,
      newCustomer.name,
      newCustomer.mobile,
      newCustomer.place,
      newCustomer.billBook,
      newCustomer.pageNo,
      newCustomer.date,
      newCustomer.notes
    ]);

    const isEven = worksheet.rowCount % 2 === 0;
    applyRowStyles(newRow, isEven);

    await workbook.xlsx.writeFile(FILE_PATH);
    return newCustomer;
  });
}

// Update existing customer
async function updateCustomer(customerId, customerData) {
  return executeLocked(async () => {
    const { workbook, worksheet } = await loadWorkbook();
    const targetId = String(customerId).trim().toUpperCase();

    let targetRowNumber = -1;
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const id = formatCellValue(row.getCell(1).value);
      if (id.toUpperCase() === targetId) {
        targetRowNumber = rowNumber;
      }
    });

    if (targetRowNumber === -1) {
      return null;
    }

    const row = worksheet.getRow(targetRowNumber);

    // Keep the existing ID intact
    const originalId = formatCellValue(row.getCell(1).value);
    const updatedCustomer = {
      id: originalId,
      name: customerData.name !== undefined ? String(customerData.name).trim() : formatCellValue(row.getCell(2).value),
      mobile: customerData.mobile !== undefined ? String(customerData.mobile).trim() : formatCellValue(row.getCell(3).value),
      place: customerData.place !== undefined ? String(customerData.place).trim() : formatCellValue(row.getCell(4).value),
      billBook: customerData.billBook !== undefined ? String(customerData.billBook).trim() : formatCellValue(row.getCell(5).value),
      pageNo: customerData.pageNo !== undefined ? String(customerData.pageNo).trim() : formatCellValue(row.getCell(6).value),
      date: customerData.date !== undefined ? String(customerData.date).trim() : formatCellValue(row.getCell(7).value),
      notes: customerData.notes !== undefined ? String(customerData.notes).trim() : formatCellValue(row.getCell(8).value)
    };

    row.getCell(2).value = updatedCustomer.name;
    row.getCell(3).value = updatedCustomer.mobile;
    row.getCell(4).value = updatedCustomer.place;
    row.getCell(5).value = updatedCustomer.billBook;
    row.getCell(6).value = updatedCustomer.pageNo;
    row.getCell(7).value = updatedCustomer.date;
    row.getCell(8).value = updatedCustomer.notes;

    applyRowStyles(row, targetRowNumber % 2 === 0);
    row.commit();

    await workbook.xlsx.writeFile(FILE_PATH);
    return updatedCustomer;
  });
}

// Delete customer
async function deleteCustomer(customerId) {
  return executeLocked(async () => {
    const { workbook, worksheet } = await loadWorkbook();
    const targetId = String(customerId).trim().toUpperCase();

    let targetRowNumber = -1;
    let deletedRecord = null;

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const id = formatCellValue(row.getCell(1).value);
      if (id.toUpperCase() === targetId) {
        targetRowNumber = rowNumber;
        deletedRecord = {
          id: id,
          name: formatCellValue(row.getCell(2).value),
          mobile: formatCellValue(row.getCell(3).value),
          place: formatCellValue(row.getCell(4).value),
          billBook: formatCellValue(row.getCell(5).value),
          pageNo: formatCellValue(row.getCell(6).value),
          date: formatCellValue(row.getCell(7).value),
          notes: formatCellValue(row.getCell(8).value)
        };
      }
    });

    if (targetRowNumber === -1) {
      return null;
    }

    worksheet.spliceRows(targetRowNumber, 1);
    await workbook.xlsx.writeFile(FILE_PATH);
    return deletedRecord;
  });
}

// Get statistics
async function getStatistics() {
  const customers = await getAllCustomers();
  const todayStr = new Date().toISOString().split('T')[0];

  const totalCustomers = customers.length;
  const todayCustomers = customers.filter(c => c.date === todayStr).length;

  const billBooksSet = new Set();
  const placesSet = new Set();

  customers.forEach(c => {
    if (c.billBook) billBooksSet.add(c.billBook);
    if (c.place) placesSet.add(c.place);
  });

  return {
    totalCustomers,
    todayCustomers,
    totalBillBooks: billBooksSet.size,
    totalPlaces: placesSet.size,
    todayDate: todayStr
  };
}

module.exports = {
  FILE_PATH,
  initExcelFile,
  getAllCustomers,
  getCustomerById,
  addCustomer,
  updateCustomer,
  deleteCustomer,
  getStatistics
};
