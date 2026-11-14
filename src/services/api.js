/**
 * TailorPro React API Service
 * Handles communication with Express + MySQL backend & Cloud Sync Queue
 */

import { clientSync } from './clientSyncService';

const BASE_URL = '/api';

export const api = {
  async request(endpoint, options = {}, timeoutMs = 8000) {
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
      return await this.request('/status', {}, 2500);
    } catch (err) {
      return {
        success: false,
        data: {
          connected: false,
          error: 'Laptop MySQL Backend is currently unreachable or offline.',
          temporaryQueueActive: true
        }
      };
    }
  },

  async getStats() {
    try {
      return await this.request('/stats', {}, 3000);
    } catch (err) {
      const localQueue = clientSync.getLocalQueue();
      return {
        success: true,
        data: {
          totalCustomers: localQueue.length,
          todayCustomers: localQueue.filter(c => c.date === new Date().toISOString().split('T')[0]).length,
          totalBillBooks: new Set(localQueue.map(c => c.billBook)).size,
          totalPlaces: new Set(localQueue.map(c => c.place)).size,
          todayDate: new Date().toISOString().split('T')[0],
          isOffline: true
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

    let mysqlCustomers = [];
    let isBackendUp = false;

    try {
      const res = await this.request(`/customers${qs}`, {}, 4000);
      if (res && res.data) {
        mysqlCustomers = Array.isArray(res.data) ? res.data : [];
        isBackendUp = true;
      }
    } catch (_) {
      isBackendUp = false;
    }

    // Retrieve locally pending records
    const localQueue = clientSync.getLocalQueue();

    // Check for items in localQueue that have now synced to MySQL, and prune them
    if (isBackendUp && mysqlCustomers.length > 0) {
      const mysqlSyncIds = new Set(mysqlCustomers.map(c => c.tempSyncId || c.temp_sync_id).filter(Boolean));
      const mysqlCustomerIds = new Set(mysqlCustomers.map(c => c.id));

      for (const item of localQueue) {
        if (mysqlCustomerIds.has(item.id) || (item.temp_sync_id && mysqlSyncIds.has(item.temp_sync_id))) {
          clientSync.removeLocalRecord(item.id);
        }
      }
    }

    // Refresh remaining pending records
    const remainingPending = clientSync.getLocalQueue().map(c => ({
      ...c,
      isPendingSync: true,
      syncStatus: 'pending'
    }));

    // Merge: Pending un-synced items at the top, followed by MySQL permanent records
    const combined = [...remainingPending, ...mysqlCustomers];

    return {
      success: true,
      isBackendUp,
      pendingCount: remainingPending.length,
      count: combined.length,
      data: combined
    };
  },

  async getCustomerById(id) {
    // Check local queue first
    const localQueue = clientSync.getLocalQueue();
    const localMatch = localQueue.find(c => c.id === id || c.temp_sync_id === id);
    if (localMatch) {
      return { success: true, data: localMatch };
    }

    return this.request(`/customers/${encodeURIComponent(id)}`);
  },

  /**
   * Create a customer record
   * Seamless Fallback:
   * 1. Attempts direct MySQL save if backend is running.
   * 2. If laptop backend is OFF / remote / offline: automatically queues in Temporary Cloud Storage!
   */
  async createCustomer(data) {
    try {
      // Attempt laptop MySQL backend first
      const res = await this.request('/customers', {
        method: 'POST',
        body: JSON.stringify(data)
      }, 3500);

      return {
        ...res,
        isPendingSync: false
      };
    } catch (netErr) {
      console.warn('Backend not directly reachable. Storing in Temporary Cloud Queue:', netErr.message);

      // Save to Temporary Cloud Queue & Local Offline Queue
      const pendingCustomer = await clientSync.queuePendingCustomer(data);

      return {
        success: true,
        isPendingSync: true,
        message: 'Customer saved to Temporary Cloud Queue (Pending Sync to Laptop MySQL).',
        data: pendingCustomer
      };
    }
  },

  async updateCustomer(id, data) {
    return this.request(`/customers/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async deleteCustomer(id) {
    // Check if in local queue
    const localQueue = clientSync.getLocalQueue();
    const existsLocally = localQueue.some(c => c.id === id);
    if (existsLocally) {
      clientSync.removeLocalRecord(id);
      return {
        success: true,
        message: 'Pending customer removed from queue.',
        data: { id }
      };
    }

    return this.request(`/customers/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
  },

  // =========================================================================
  // SYNCHRONIZATION API METHODS
  // =========================================================================

  async getSyncStatus() {
    try {
      const res = await this.request('/sync/status', {}, 3000);
      const localQueue = clientSync.getLocalQueue();
      return {
        ...res,
        data: {
          ...res.data,
          localDevicePendingCount: localQueue.length
        }
      };
    } catch (_) {
      const localQueue = clientSync.getLocalQueue();
      return {
        success: true,
        data: {
          autoSyncActive: false,
          mysqlConnected: false,
          totalPendingRecords: localQueue.length,
          successfullySyncedRecords: 0,
          failedRecords: 0,
          lastSyncTime: null,
          lastSyncStatus: 'offline',
          lastSyncMessage: 'Laptop backend is offline. Records are stored in Temporary Cloud Queue.',
          mainDatabase: 'Laptop MySQL (tailor_shop_db) [Offline]',
          temporaryStorage: 'Cloud Sync Queue [Active]',
          localDevicePendingCount: localQueue.length
        }
      };
    }
  },

  async triggerSyncNow() {
    try {
      // First flush any local queue to cloud
      await clientSync.flushLocalQueueToCloud();
      // Then trigger laptop backend sync worker
      return await this.request('/sync/trigger', { method: 'POST' });
    } catch (err) {
      await clientSync.flushLocalQueueToCloud();
      return {
        success: false,
        message: 'Could not contact laptop backend. Pending records pushed to Cloud Queue and will sync when laptop is turned ON.',
        error: err.message
      };
    }
  },

  async getSyncLogs() {
    try {
      return await this.request('/sync/logs', {}, 3000);
    } catch (_) {
      return { success: true, count: 0, data: [] };
    }
  },

  async runSyncTest() {
    return this.request('/sync/test', { method: 'POST' });
  },

  exportExcel() {
    window.location.href = `${BASE_URL}/export`;
  }
};
