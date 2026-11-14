/**
 * Kapse - G React API Service
 * Handles direct communication with Express + MySQL backend
 */

const BASE_URL = '/api';

export const api = {
  async request(endpoint, options = {}, timeoutMs = 10000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      signal: controller.signal,
      ...options
    };

    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, config);
      clearTimeout(timeoutId);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `API error (${response.status})`);
      }

      return data;
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  },

  async getStatus() {
    try {
      return await this.request('/status', {}, 5000);
    } catch (err) {
      return {
        success: false,
        data: {
          connected: false,
          error: 'MySQL database is connecting or currently unreachable.'
        }
      };
    }
  },

  async getStats() {
    try {
      return await this.request('/stats', {}, 5000);
    } catch {
      return {
        success: false,
        data: {
          totalCustomers: 0,
          todayCustomers: 0,
          totalBillBooks: 0,
          totalPlaces: 0,
          todayDate: new Date().toISOString().split('T')[0]
        }
      };
    }
  },

  async getCustomers(query = {}) {
    const params = new URLSearchParams();
    if (query.search) params.append('search', query.search);
    if (query.sortBy) params.append('sortBy', query.sortBy);
    if (query.order) params.append('order', query.order);

    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/customers${qs}`, {}, 8000);
  },

  async getCustomer(id) {
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
