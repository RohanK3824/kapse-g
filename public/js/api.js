/**
 * TailorPro - API Service
 * Handles all HTTP communication with the Node.js / Express backend
 */

const API = {
  BASE_URL: '/api',

  /**
   * Helper for fetch requests
   */
  async request(endpoint, options = {}) {
    try {
      const config = {
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {})
        },
        ...options
      };

      const response = await fetch(`${this.BASE_URL}${endpoint}`, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`API Error on [${options.method || 'GET'} ${endpoint}]:`, error);
      throw error;
    }
  },

  /**
   * Fetch dashboard statistics
   */
  async getStats() {
    return this.request('/stats');
  },

  /**
   * Fetch customer records from Excel
   * @param {Object} query - { search, sortBy, order }
   */
  async getCustomers(query = {}) {
    const params = new URLSearchParams();
    if (query.search) params.append('search', query.search);
    if (query.sortBy) params.append('sortBy', query.sortBy);
    if (query.order) params.append('order', query.order);

    const queryString = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/customers${queryString}`);
  },

  /**
   * Fetch a single customer by ID
   * @param {string} id
   */
  async getCustomerById(id) {
    return this.request(`/customers/${encodeURIComponent(id)}`);
  },

  /**
   * Add a new customer to Excel database
   * @param {Object} customerData
   */
  async createCustomer(customerData) {
    return this.request('/customers', {
      method: 'POST',
      body: JSON.stringify(customerData)
    });
  },

  /**
   * Update an existing customer in Excel database
   * @param {string} id
   * @param {Object} customerData
   */
  async updateCustomer(id, customerData) {
    return this.request(`/customers/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(customerData)
    });
  },

  /**
   * Delete a customer record from Excel database
   * @param {string} id
   */
  async deleteCustomer(id) {
    return this.request(`/customers/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
  },

  /**
   * Trigger download of customers.xlsx
   */
  exportExcel() {
    window.location.href = `${this.BASE_URL}/export`;
  }
};

window.API = API;
