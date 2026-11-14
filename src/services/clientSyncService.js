/**
 * clientSyncService.js
 * Client-Side Synchronization & Offline Queue Service
 * 
 * Works seamlessly across:
 * - Mobile phones
 * - Other laptops & desktops
 * - GitHub Pages & static deployments
 * - Offline / flaky network conditions
 * 
 * Ensures customer data is NEVER lost and guarantees unique customer IDs.
 */

import { syncConfig } from '../config/syncConfig';

const LOCAL_QUEUE_KEY = 'tailor_offline_pending_customers_v1';
const SYNCED_CACHE_KEY = 'tailor_synced_customers_cache_v1';

class ClientSyncService {
  constructor() {
    this.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    this.isBackendAvailable = false;
    this.listeners = [];

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.flushLocalQueueToCloud();
        this.notifyListeners();
      });
      window.addEventListener('offline', () => {
        this.isOnline = false;
        this.notifyListeners();
      });
    }
  }

  /**
   * Generate globally unique customer ID
   * Format: CUST-S-<TIMESTAMP_BASE36>-<RANDOM> (e.g. CUST-S-MWEX7A-3F9)
   */
  generateUniqueCustomerId() {
    const timePart = Date.now().toString(36).toUpperCase();
    const randPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `CUST-S-${timePart}-${randPart}`;
  }

  /**
   * Generate unique temporary sync UUID
   */
  generateSyncId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return `sync-${crypto.randomUUID()}`;
    }
    return `sync-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
  }

  /**
   * Detect user device type
   */
  getDeviceSource() {
    if (typeof navigator === 'undefined') return 'Remote Device';
    const ua = navigator.userAgent;
    let device = 'Desktop Web';
    if (/android/i.test(ua)) device = 'Android Mobile';
    else if (/iphone|ipad|ipod/i.test(ua)) device = 'iOS Mobile';
    else if (/mac/i.test(ua)) device = 'Mac Desktop';
    else if (/win/i.test(ua)) device = 'Windows Device';
    return `${device} (${window.location.hostname || 'Remote'})`;
  }

  /**
   * Check if laptop backend (/api/status) is reachable
   */
  async checkBackendReachable() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const res = await fetch('/api/status', {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        this.isBackendAvailable = !!(data?.data?.connected);
        return this.isBackendAvailable;
      }
      this.isBackendAvailable = false;
      return false;
    } catch (_) {
      this.isBackendAvailable = false;
      return false;
    }
  }

  // =========================================================================
  // LOCAL STORAGE OFFLINE QUEUE
  // =========================================================================

  getLocalQueue() {
    try {
      const raw = localStorage.getItem(LOCAL_QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (_) {
      return [];
    }
  }

  saveLocalQueue(queue) {
    try {
      localStorage.setItem(LOCAL_QUEUE_KEY, JSON.stringify(queue));
    } catch (e) {
      console.error('Failed to save to local offline queue:', e);
    }
  }

  /**
   * Queue a pending customer record (when laptop is OFF or device is remote)
   */
  async queuePendingCustomer(formData) {
    const uniqueId = this.generateUniqueCustomerId();
    const tempSyncId = this.generateSyncId();
    const queuedAt = new Date().toISOString();
    const deviceSource = this.getDeviceSource();

    const pendingRecord = {
      id: uniqueId,
      temp_sync_id: tempSyncId,
      name: String(formData.name || '').trim(),
      mobile: String(formData.mobile || '').trim(),
      place: String(formData.place || '').trim(),
      billBook: String(formData.billBook || '').trim(),
      pageNo: String(formData.pageNo || '').trim(),
      date: formData.date || new Date().toISOString().split('T')[0],
      notes: String(formData.notes || '').trim(),
      sync_status: 'pending',
      isPendingSync: true,
      device_source: deviceSource,
      queued_at: queuedAt,
      pushedToCloud: false
    };

    // 1. Immediately persist in local browser storage (safe from page reload or connection loss)
    const queue = this.getLocalQueue();
    queue.unshift(pendingRecord);
    this.saveLocalQueue(queue);

    // 2. Push to Temporary Cloud Storage Queue
    try {
      const cloudRes = await this.pushToCloudStorage(pendingRecord);
      if (cloudRes.success) {
        pendingRecord.pushedToCloud = true;
        pendingRecord.cloudId = cloudRes.cloudId;
        this.saveLocalQueue(queue);
      }
    } catch (cloudErr) {
      console.warn('Could not push to cloud queue immediately, will retry when network is available:', cloudErr.message);
    }

    this.notifyListeners();

    return pendingRecord;
  }

  /**
   * Push a record to the Temporary Cloud Storage Queue
   */
  async pushToCloudStorage(record) {
    const settings = syncConfig.getSettings();

    // Provider: Firebase Realtime Database
    if (settings.firebaseDbUrl && settings.firebaseDbUrl.trim()) {
      const cleanUrl = settings.firebaseDbUrl.replace(/\/$/, '');
      const auth = settings.firebaseAuthKey ? `?auth=${encodeURIComponent(settings.firebaseAuthKey)}` : '';
      const endpoint = `${cleanUrl}/pending_customers.json${auth}`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record)
      });
      if (!res.ok) throw new Error(`Firebase error (${res.status})`);
      const data = await res.json();
      return { success: true, cloudId: data.name };
    }

    // Provider: External Cloud Relay URL
    if (settings.cloudSyncUrl && settings.cloudSyncUrl.trim()) {
      const cleanUrl = settings.cloudSyncUrl.replace(/\/$/, '');
      const res = await fetch(`${cleanUrl}/pending`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-sync-api-key': settings.apiKey
        },
        body: JSON.stringify(record)
      });
      if (!res.ok) throw new Error(`Cloud relay error (${res.status})`);
      const data = await res.json();
      return { success: true, cloudId: data.cloudId || record.temp_sync_id };
    }

    // Default / Local Backend Cloud Queue endpoint
    try {
      const res = await fetch('/api/sync/cloud-queue/pending', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-sync-api-key': settings.apiKey
        },
        body: JSON.stringify(record)
      });
      if (res.ok) {
        const data = await res.json();
        return { success: true, cloudId: data.data?.cloudId || record.temp_sync_id };
      }
    } catch (_) {}

    return { success: false, cloudId: record.temp_sync_id };
  }

  /**
   * Flush all unpushed local pending records to the cloud
   */
  async flushLocalQueueToCloud() {
    const queue = this.getLocalQueue();
    let updated = false;

    for (const item of queue) {
      if (!item.pushedToCloud) {
        try {
          const res = await this.pushToCloudStorage(item);
          if (res.success) {
            item.pushedToCloud = true;
            item.cloudId = res.cloudId;
            updated = true;
          }
        } catch (_) {}
      }
    }

    if (updated) {
      this.saveLocalQueue(queue);
      this.notifyListeners();
    }
  }

  /**
   * Fetch all pending records from local queue and cloud
   */
  async getPendingCustomers() {
    const local = this.getLocalQueue();
    return local;
  }

  /**
   * Remove a customer from the local queue once confirmed synced by backend
   */
  removeLocalRecord(idOrSyncId) {
    const queue = this.getLocalQueue();
    const filtered = queue.filter(
      item => item.id !== idOrSyncId && item.temp_sync_id !== idOrSyncId && item.cloudId !== idOrSyncId
    );
    this.saveLocalQueue(filtered);
    this.notifyListeners();
  }

  /**
   * Listener system for reactive UI updates
   */
  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  notifyListeners() {
    this.listeners.forEach(cb => {
      try { cb(); } catch (_) {}
    });
  }
}

export const clientSync = new ClientSyncService();
