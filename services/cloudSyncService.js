/**
 * cloudSyncService.js
 * Cloud Synchronization Adapter for Kapse - G 🔰 Tailor Shop
 * 
 * Manages communication with the Temporary Cloud Storage Queue:
 * - Supports:
 *   1. 'local' / Built-in Cloud Queue (embedded file-backed persistent queue for local testing & zero-setup dev)
 *   2. 'firebase' (Firebase Realtime Database REST API - 100% free forever, zero server required for GitHub Pages)
 *   3. 'relay' (Custom Cloud Sync Relay - e.g. Vercel, Render, Railway, Cloudflare Workers)
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();

const TEMP_QUEUE_FILE = path.join(__dirname, '..', 'backups', 'temp_cloud_queue.json');

class CloudSyncService {
  constructor() {
    this.provider = (process.env.CLOUD_SYNC_PROVIDER || 'local').toLowerCase();
    this.cloudUrl = process.env.CLOUD_SYNC_URL || '';
    this.apiKey = process.env.SYNC_API_KEY || 'kapse-g-tailor-sync-sec-2026';
    this.firebaseUrl = process.env.FIREBASE_DB_URL || '';
    this.firebaseAuth = process.env.FIREBASE_AUTH_KEY || '';

    // In-memory queue cache for local provider
    this.localQueue = [];
    this.initLocalQueue();
  }

  /**
   * Initialize local queue from disk if local provider is active
   */
  initLocalQueue() {
    try {
      const dir = path.dirname(TEMP_QUEUE_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      if (fs.existsSync(TEMP_QUEUE_FILE)) {
        const raw = fs.readFileSync(TEMP_QUEUE_FILE, 'utf8');
        this.localQueue = JSON.parse(raw);
      } else {
        this.localQueue = [];
        this.saveLocalQueue();
      }
    } catch (err) {
      console.warn('[CloudSyncService] Could not read local queue file, initializing empty:', err.message);
      this.localQueue = [];
    }
  }

  saveLocalQueue() {
    try {
      fs.writeFileSync(TEMP_QUEUE_FILE, JSON.stringify(this.localQueue, null, 2), 'utf8');
    } catch (err) {
      console.error('[CloudSyncService] Failed to persist local queue to disk:', err.message);
    }
  }

  getProvider() {
    // If Firebase URL is provided, prefer firebase
    if (this.firebaseUrl && this.firebaseUrl.trim().length > 0) {
      return 'firebase';
    }
    // If external Cloud Relay URL is provided, prefer relay
    if (this.cloudUrl && this.cloudUrl.trim().length > 0) {
      return 'relay';
    }
    return this.provider || 'local';
  }

  /**
   * Fetch all pending customer records from Temporary Cloud Storage
   * @returns {Promise<Array<{cloudId: string, record: object}>>}
   */
  async fetchPendingRecords() {
    const activeProvider = this.getProvider();

    if (activeProvider === 'firebase') {
      return this._fetchFirebase();
    } else if (activeProvider === 'relay') {
      return this._fetchRelay();
    } else {
      return this._fetchLocal();
    }
  }

  /**
   * Delete a pending customer record from Temporary Cloud Storage
   * ONLY called after successful MySQL database insertion
   * @param {string} cloudId 
   * @returns {Promise<boolean>}
   */
  async deleteCloudRecord(cloudId) {
    const activeProvider = this.getProvider();

    if (activeProvider === 'firebase') {
      return this._deleteFirebase(cloudId);
    } else if (activeProvider === 'relay') {
      return this._deleteRelay(cloudId);
    } else {
      return this._deleteLocal(cloudId);
    }
  }

  /**
   * Push a pending customer record to Temporary Cloud Storage
   * (Used during tests, local dev, or when forwarding)
   */
  async pushRecordToCloud(record) {
    const activeProvider = this.getProvider();

    if (activeProvider === 'firebase') {
      return this._pushFirebase(record);
    } else if (activeProvider === 'relay') {
      return this._pushRelay(record);
    } else {
      return this._pushLocal(record);
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    try {
      const pending = await this.fetchPendingRecords();
      return {
        provider: this.getProvider(),
        pendingCount: pending.length,
        isConfigured: true,
        endpoint: this.getProvider() === 'firebase' 
          ? this.firebaseUrl 
          : this.getProvider() === 'relay' 
            ? this.cloudUrl 
            : 'Built-in Local Cloud Relay'
      };
    } catch (err) {
      return {
        provider: this.getProvider(),
        pendingCount: 0,
        isConfigured: false,
        error: err.message
      };
    }
  }

  // =========================================================================
  // LOCAL PROVIDER IMPLEMENTATION
  // =========================================================================
  async _fetchLocal() {
    this.initLocalQueue();
    return this.localQueue.map(item => ({
      cloudId: item.cloudId || item.temp_sync_id || item.id,
      record: item
    }));
  }

  async _deleteLocal(cloudId) {
    this.initLocalQueue();
    const initialLen = this.localQueue.length;
    this.localQueue = this.localQueue.filter(
      item => item.cloudId !== cloudId && item.temp_sync_id !== cloudId && item.id !== cloudId
    );
    this.saveLocalQueue();
    return this.localQueue.length < initialLen;
  }

  async _pushLocal(record) {
    this.initLocalQueue();
    const cloudId = record.temp_sync_id || record.tempSyncId || record.id || `cloud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const fullRecord = {
      ...record,
      cloudId,
      temp_sync_id: record.temp_sync_id || cloudId,
      queued_at: record.queued_at || new Date().toISOString(),
      sync_status: 'pending'
    };

    // Prevent duplicate push into local queue
    const exists = this.localQueue.some(item => item.cloudId === cloudId || item.temp_sync_id === cloudId);
    if (!exists) {
      this.localQueue.push(fullRecord);
      this.saveLocalQueue();
    }
    return { success: true, cloudId, record: fullRecord };
  }

  // =========================================================================
  // FIREBASE REALTIME DATABASE IMPLEMENTATION (REST API)
  // =========================================================================
  async _fetchFirebase() {
    const cleanUrl = this.firebaseUrl.replace(/\/$/, '');
    const authQuery = this.firebaseAuth ? `?auth=${encodeURIComponent(this.firebaseAuth)}` : '';
    const endpoint = `${cleanUrl}/pending_customers.json${authQuery}`;

    const res = await fetch(endpoint, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!res.ok) {
      throw new Error(`Firebase fetch failed (${res.status}): ${res.statusText}`);
    }

    const data = await res.json();
    if (!data) return [];

    const records = [];
    for (const [key, val] of Object.entries(data)) {
      if (val && typeof val === 'object') {
        records.push({
          cloudId: key,
          record: { ...val, temp_sync_id: val.temp_sync_id || key }
        });
      }
    }
    return records;
  }

  async _deleteFirebase(cloudId) {
    const cleanUrl = this.firebaseUrl.replace(/\/$/, '');
    const authQuery = this.firebaseAuth ? `?auth=${encodeURIComponent(this.firebaseAuth)}` : '';
    const endpoint = `${cleanUrl}/pending_customers/${encodeURIComponent(cloudId)}.json${authQuery}`;

    const res = await fetch(endpoint, {
      method: 'DELETE',
      headers: { 'Accept': 'application/json' }
    });

    return res.ok;
  }

  async _pushFirebase(record) {
    const cleanUrl = this.firebaseUrl.replace(/\/$/, '');
    const authQuery = this.firebaseAuth ? `?auth=${encodeURIComponent(this.firebaseAuth)}` : '';
    const endpoint = `${cleanUrl}/pending_customers.json${authQuery}`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        ...record,
        sync_status: 'pending',
        queued_at: new Date().toISOString()
      })
    });

    if (!res.ok) {
      throw new Error(`Firebase push failed (${res.status}): ${res.statusText}`);
    }

    const result = await res.json();
    return { success: true, cloudId: result.name };
  }

  // =========================================================================
  // CUSTOM CLOUD RELAY IMPLEMENTATION (REST API)
  // =========================================================================
  async _fetchRelay() {
    const cleanUrl = this.cloudUrl.replace(/\/$/, '');
    const endpoint = `${cleanUrl}/pending`;

    const res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'x-sync-api-key': this.apiKey,
        'Authorization': `Bearer ${this.apiKey}`
      }
    });

    if (!res.ok) {
      throw new Error(`Cloud relay fetch failed (${res.status}): ${res.statusText}`);
    }

    const data = await res.json();
    const items = Array.isArray(data) ? data : (data.records || data.data || []);
    return items.map(item => ({
      cloudId: item.cloudId || item.temp_sync_id || item.id,
      record: item
    }));
  }

  async _deleteRelay(cloudId) {
    const cleanUrl = this.cloudUrl.replace(/\/$/, '');
    const endpoint = `${cleanUrl}/pending/${encodeURIComponent(cloudId)}`;

    const res = await fetch(endpoint, {
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
        'x-sync-api-key': this.apiKey,
        'Authorization': `Bearer ${this.apiKey}`
      }
    });

    return res.ok;
  }

  async _pushRelay(record) {
    const cleanUrl = this.cloudUrl.replace(/\/$/, '');
    const endpoint = `${cleanUrl}/pending`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'x-sync-api-key': this.apiKey,
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(record)
    });

    if (!res.ok) {
      throw new Error(`Cloud relay push failed (${res.status}): ${res.statusText}`);
    }

    const result = await res.json();
    return { success: true, cloudId: result.cloudId || record.temp_sync_id };
  }
}

const cloudSyncService = new CloudSyncService();
module.exports = cloudSyncService;
