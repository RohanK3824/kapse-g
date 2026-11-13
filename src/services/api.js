/**
 * TailorPro React API Service
 * Handles communication with Express + MySQL backend
 */

const BASE_URL = '/api';

export const api = {
  async request(endpoint, options = {}) {
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      ...options
    };

    const response = await fetch(`${BASE_URL}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `API error (${response.status})`);
    }

    return data;
  },

  async getStatus() {
    return this.request('/status');
  },

  async getStats() {
    return this.request('/stats');
  },

  async getCustomers(query = {}) {
    const params = new URLSearchParams();
    if (query.search) params.append('search', query.search);
    if (query.sortBy) params.append('sortBy', query.sortBy);
    if (query.order) params.append('order', query.order);

    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/customers${qs}`);
  },

  async getCustomerById(id) {
    return this.request(`/customers/${encodeURIComponent(id)}`);
  },

  async createCustomer(data) {
    return this.request('/customers', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updateCustomer(id, data) {
    return this.request(`/customers/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async deleteCustomer(id) {
    return this.request(`/customers/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
  },

  exportExcel() {
    window.location.href = `${BASE_URL}/export`;
  }
};
