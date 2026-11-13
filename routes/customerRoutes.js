const express = require('express');
const router = express.Router();
const mysqlService = require('../services/mysqlService');

// Input validation helper
function validateCustomerData(data, isUpdate = false) {
  const errors = [];
  const { name, mobile, place, billBook, pageNo } = data;

  if (!isUpdate || name !== undefined) {
    if (!name || String(name).trim().length === 0) {
      errors.push('Customer Name is required.');
    }
  }

  if (!isUpdate || mobile !== undefined) {
    if (!mobile || String(mobile).trim().length === 0) {
      errors.push('Mobile Number is required.');
    } else {
      const cleanMobile = String(mobile).replace(/\D/g, '');
      if (cleanMobile.length < 7 || cleanMobile.length > 15) {
        errors.push('Please enter a valid mobile number (7-15 digits).');
      }
    }
  }

  if (!isUpdate || place !== undefined) {
    if (!place || String(place).trim().length === 0) {
      errors.push('Place / Address is required.');
    }
  }

  if (!isUpdate || billBook !== undefined) {
    if (!billBook || String(billBook).trim().length === 0) {
      errors.push('Bill Book Number is required.');
    }
  }

  if (!isUpdate || pageNo !== undefined) {
    if (!pageNo || String(pageNo).trim().length === 0) {
      errors.push('Page Number is required.');
    }
  }

  return errors;
}

// GET /api/status - Check database connection status & health
router.get('/status', async (req, res) => {
  try {
    const health = await mysqlService.getDatabaseHealth();
    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to inspect database health',
      error: error.message
    });
  }
});

// GET /api/stats - Dashboard summary statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await mysqlService.getStatistics();
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error getting statistics:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to retrieve statistics from MySQL', 
      error: error.message 
    });
  }
});

// GET /api/customers - Fetch all customer records from MySQL
// Supports ?search=...&sortBy=...&order=asc|desc
router.get('/customers', async (req, res) => {
  try {
    const { search, sortBy, order } = req.query;
    const customers = await mysqlService.getAllCustomers({ search, sortBy, order });

    res.json({
      success: true,
      count: customers.length,
      data: customers
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to read customer records from MySQL database', 
      error: error.message 
    });
  }
});

// GET /api/customers/:id - Fetch a particular customer
router.get('/customers/:id', async (req, res) => {
  try {
    const customer = await mysqlService.getCustomerById(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: `Customer with ID "${req.params.id}" not found.` });
    }
    res.json({ success: true, data: customer });
  } catch (error) {
    console.error(`Error fetching customer ${req.params.id}:`, error);
    res.status(500).json({ success: false, message: 'Failed to fetch customer record', error: error.message });
  }
});

// POST /api/customers - Add a new customer to MySQL
router.post('/customers', async (req, res) => {
  try {
    const errors = validateCustomerData(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join(' '), errors });
    }

    const newCustomer = await mysqlService.addCustomer(req.body);
    res.status(201).json({
      success: true,
      message: 'Customer registered successfully and stored in MySQL database.',
      data: newCustomer
    });
  } catch (error) {
    console.error('Error adding customer:', error);
    res.status(500).json({ success: false, message: 'Failed to save customer record to MySQL', error: error.message });
  }
});

// PUT /api/customers/:id - Update an existing customer in MySQL
router.put('/customers/:id', async (req, res) => {
  try {
    const errors = validateCustomerData(req.body, true);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join(' '), errors });
    }

    const updatedCustomer = await mysqlService.updateCustomer(req.params.id, req.body);
    if (!updatedCustomer) {
      return res.status(404).json({ success: false, message: `Customer with ID "${req.params.id}" not found.` });
    }

    res.json({
      success: true,
      message: 'Customer details updated successfully in MySQL database.',
      data: updatedCustomer
    });
  } catch (error) {
    console.error(`Error updating customer ${req.params.id}:`, error);
    res.status(500).json({ success: false, message: 'Failed to update customer record in MySQL', error: error.message });
  }
});

// DELETE /api/customers/:id - Delete a customer from MySQL
router.delete('/customers/:id', async (req, res) => {
  try {
    const deletedCustomer = await mysqlService.deleteCustomer(req.params.id);
    if (!deletedCustomer) {
      return res.status(404).json({ success: false, message: `Customer with ID "${req.params.id}" not found.` });
    }

    res.json({
      success: true,
      message: `Customer ${deletedCustomer.name} (${deletedCustomer.id}) deleted successfully from MySQL database.`,
      data: deletedCustomer
    });
  } catch (error) {
    console.error(`Error deleting customer ${req.params.id}:`, error);
    res.status(500).json({ success: false, message: 'Failed to delete customer record from MySQL', error: error.message });
  }
});

// GET /api/export - Export MySQL customer records as Excel (.xlsx) file
router.get('/export', async (req, res) => {
  try {
    const buffer = await mysqlService.exportToExcel();
    const today = new Date().toISOString().split('T')[0];
    const filename = `Tailor_Customers_MySQL_${today}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ success: false, message: 'Failed to export customer records', error: error.message });
  }
});

module.exports = router;
