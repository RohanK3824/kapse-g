/**
 * syncConfig.js
 * Client-Side Configuration for Automatic Data Synchronization
 * 
 * Supports:
 * 1. Environment variables from Vite (VITE_CLOUD_SYNC_URL, VITE_FIREBASE_DB_URL, VITE_SYNC_API_KEY)
 * 2. Dynamic user configuration saved in localStorage (useful when deployed on GitHub Pages)
 * 3. Default fallback to internal cloud relay
 */

const STORAGE_KEY = 'kapse_sync_settings_v1';

export const syncConfig = {
  getSettings() {
    let saved = {};
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) saved = JSON.parse(raw);
    } catch (_) {}

    return {
      provider: saved.provider || import.meta.env.VITE_CLOUD_SYNC_PROVIDER || 'auto',
      cloudSyncUrl: saved.cloudSyncUrl || import.meta.env.VITE_CLOUD_SYNC_URL || '',
      firebaseDbUrl: saved.firebaseDbUrl || import.meta.env.VITE_FIREBASE_DB_URL || '',
      firebaseAuthKey: saved.firebaseAuthKey || import.meta.env.VITE_FIREBASE_AUTH_KEY || '',
      apiKey: saved.apiKey || import.meta.env.VITE_SYNC_API_KEY || 'kapse-g-tailor-sync-sec-2026',
      autoSyncIntervalMs: 25000
    };
  },

  saveSettings(newSettings) {
    try {
      const current = this.getSettings();
      const merged = { ...current, ...newSettings };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      return merged;
    } catch (e) {
      console.error('Failed to save sync settings to localStorage:', e);
      return this.getSettings();
    }
  },

  resetSettings() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (_) {}
  }
};
