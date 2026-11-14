import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { clientSync } from '../services/clientSyncService';
import { syncConfig } from '../config/syncConfig';

export default function SyncDashboardView({ onNavigate, onViewCustomer, addToast }) {
  const [syncStatus, setSyncStatus] = useState(null);
  const [pendingRecords, setPendingRecords] = useState([]);
  const [syncLogs, setSyncLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [testing, setTesting] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'pending' | 'logs' | 'settings'

  // Settings State
  const [settings, setSettings] = useState(syncConfig.getSettings());
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Fetch all sync data
  const loadSyncData = useCallback(async () => {
    try {
      const [statusRes, logsRes] = await Promise.all([
        api.getSyncStatus(),
        api.getSyncLogs()
      ]);

      if (statusRes && statusRes.data) {
        setSyncStatus(statusRes.data);
      }

      if (logsRes && logsRes.data) {
        setSyncLogs(logsRes.data);
      }

      const pending = clientSync.getLocalQueue();
      setPendingRecords(pending);
    } catch (err) {
      console.error('Error fetching sync data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSyncData();
    // Auto-refresh sync dashboard status every 12 seconds
    const interval = setInterval(loadSyncData, 12000);
    const unsubscribe = clientSync.subscribe(() => {
      setPendingRecords(clientSync.getLocalQueue());
    });
    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [loadSyncData]);

  // Handle "Sync Now" button
  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      const res = await api.triggerSyncNow();
      if (res.success) {
        addToast('Synchronization Completed', res.message || 'Records synchronized to MySQL database.', 'success');
      } else {
        addToast('Sync Update', res.message || 'Sync cycle completed.', 'info');
      }
      await loadSyncData();
    } catch (err) {
      addToast('Sync Notice', err.message || 'Failed to trigger synchronization.', 'error');
    } finally {
      setSyncing(false);
    }
  };

  // Handle "Run Sync Test" button
  const handleRunTest = async () => {
    setTesting(true);
    try {
      const res = await api.runSyncTest();
      if (res.success) {
        addToast('Sync Test Passed! 🎉', 'Temporary cloud record was created, synced to MySQL, verified, and cleaned up.', 'success');
      } else {
        addToast('Test Failed', res.message || 'Sync test encountered an issue.', 'error');
      }
      await loadSyncData();
    } catch (err) {
      addToast('Test Error', err.message || 'Could not run diagnostic sync test.', 'error');
    } finally {
      setTesting(false);
    }
  };

  // Handle Saving Cloud Settings
  const handleSaveSettings = (e) => {
    e.preventDefault();
    syncConfig.saveSettings(settings);
    setSettingsSaved(true);
    addToast('Settings Saved', 'Temporary Cloud Queue configuration updated.', 'success');
    setTimeout(() => setSettingsSaved(false), 3000);
  };

  const formatTimeAgo = (isoString) => {
    if (!isoString) return 'Never';
    try {
      const date = new Date(isoString);
      const diffSecs = Math.floor((new Date() - date) / 1000);
      if (diffSecs < 10) return 'Just now';
      if (diffSecs < 60) return `${diffSecs}s ago`;
      const diffMins = Math.floor(diffSecs / 60);
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (_) {
      return isoString;
    }
  };

  const isLaptopOnline = syncStatus?.mysqlConnected ?? false;
  const totalPending = syncStatus?.totalPendingRecords ?? pendingRecords.length;
  const totalSynced = syncStatus?.successfullySyncedRecords ?? syncStatus?.dbSummary?.totalSyncedFromRemote ?? 0;
  const totalFailed = syncStatus?.failedRecords ?? 0;
  const lastSync = syncStatus?.lastSyncTime;

  return (
    <div className="view-sync-dashboard">
      {/* Synchronization Header Banner */}
      <div className="sync-banner">
        <div className="sync-banner-content">
          <div className="sync-banner-icon">
            <i className="fa-solid fa-cloud-arrow-down"></i>
          </div>
          <div>
            <h2>Automatic Data Synchronization</h2>
            <p>
              Your laptop's MySQL database is the <strong>Permanent Master</strong>. 
              Customer records entered from mobile phones or remote devices wait securely in the <strong>Temporary Cloud Queue</strong> and synchronize automatically when your laptop is switched ON.
            </p>
          </div>
        </div>

        <div className="sync-banner-actions">
          <button 
            className="btn btn-primary btn-sync-now" 
            onClick={handleSyncNow} 
            disabled={syncing}
          >
            <i className={`fa-solid fa-arrows-rotate ${syncing ? 'fa-spin' : ''}`}></i>
            <span>{syncing ? 'Synchronizing...' : 'Sync Now'}</span>
          </button>

          <button 
            className="btn btn-navy-outline" 
            onClick={handleRunTest} 
            disabled={testing || !isLaptopOnline}
            title={!isLaptopOnline ? 'Requires laptop backend to be running' : 'Test cloud-to-MySQL pipeline'}
          >
            <i className={`fa-solid fa-vial-circle-check ${testing ? 'fa-spin' : ''}`}></i>
            <span>{testing ? 'Testing...' : 'Test Sync'}</span>
          </button>
        </div>
      </div>

      {/* Real-Time Architecture & Connectivity Cards */}
      <div className="sync-arch-grid">
        <div className={`sync-arch-card ${isLaptopOnline ? 'status-online' : 'status-offline'}`}>
          <div className="arch-card-header">
            <div className="arch-icon-wrap primary">
              <i className="fa-solid fa-laptop-code"></i>
            </div>
            <div className="arch-meta">
              <span className="arch-label">MAIN DATABASE (LAPTOP)</span>
              <h4>MySQL : tailor_shop_db</h4>
            </div>
            <span className={`sync-status-pill ${isLaptopOnline ? 'online' : 'offline'}`}>
              <span className="dot"></span>
              {isLaptopOnline ? 'Online / Source of Truth' : 'Laptop Offline (Waiting)'}
            </span>
          </div>
          <div className="arch-card-body">
            <div className="arch-stat-row">
              <span>Total Permanent Records:</span>
              <strong>{syncStatus?.dbSummary?.totalPermanentRecords || 0} Customers</strong>
            </div>
            <div className="arch-stat-row">
              <span>Database Engine:</span>
              <span>InnoDB / UTF-8 Unicode</span>
            </div>
          </div>
        </div>

        <div className="sync-arch-card status-online">
          <div className="arch-card-header">
            <div className="arch-icon-wrap accent">
              <i className="fa-solid fa-cloud"></i>
            </div>
            <div className="arch-meta">
              <span className="arch-label">TEMPORARY SYNC QUEUE</span>
              <h4>{syncStatus?.temporaryStorage || 'Cloud Sync Queue'}</h4>
            </div>
            <span className="sync-status-pill online">
              <span className="dot"></span> Active Buffer
            </span>
          </div>
          <div className="arch-card-body">
            <div className="arch-stat-row">
              <span>Cloud Storage Provider:</span>
              <strong style={{ textTransform: 'capitalize' }}>
                {syncStatus?.provider || settings.provider || 'Local / Cloud Relay'}
              </strong>
            </div>
            <div className="arch-stat-row">
              <span>Auto-Sync Interval:</span>
              <span>Every {syncStatus?.intervalSeconds || 25} seconds (Automatic)</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Core Requirement Metrics Cards */}
      <div className="stats-grid sync-metrics-grid">
        {/* Card 1: Total Pending Records */}
        <div className={`stat-card ${totalPending > 0 ? 'highlight-warning' : ''}`}>
          <div className="stat-icon warning">
            <i className="fa-solid fa-hourglass-half"></i>
          </div>
          <div className="stat-content">
            <span className="stat-title">Total Pending Records</span>
            <div className="stat-value">{totalPending}</div>
            <p className="stat-trend">
              {totalPending > 0 ? (
                <span className="text-warning">
                  <i className="fa-solid fa-triangle-exclamation"></i> Waiting for laptop MySQL sync
                </span>
              ) : (
                <span className="text-success">
                  <i className="fa-solid fa-check"></i> All records in sync
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Card 2: Successfully Synced Records */}
        <div className="stat-card">
          <div className="stat-icon success">
            <i className="fa-solid fa-circle-check"></i>
          </div>
          <div className="stat-content">
            <span className="stat-title">Successfully Synced</span>
            <div className="stat-value">{totalSynced}</div>
            <p className="stat-trend text-success">
              <i className="fa-solid fa-shield-halved"></i> Safely inserted into MySQL
            </p>
          </div>
        </div>

        {/* Card 3: Failed Records */}
        <div className="stat-card">
          <div className="stat-icon danger">
            <i className="fa-solid fa-circle-exclamation"></i>
          </div>
          <div className="stat-content">
            <span className="stat-title">Failed Records</span>
            <div className="stat-value">{totalFailed}</div>
            <p className="stat-trend">
              {totalFailed > 0 ? (
                <span className="text-danger">
                  <i className="fa-solid fa-rotate-left"></i> Retries automatically
                </span>
              ) : (
                <span className="text-muted">
                  <i className="fa-solid fa-shield"></i> 0 errors detected
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Card 4: Last Sync Time */}
        <div className="stat-card">
          <div className="stat-icon primary">
            <i className="fa-solid fa-clock-rotate-left"></i>
          </div>
          <div className="stat-content">
            <span className="stat-title">Last Sync Time</span>
            <div className="stat-value" style={{ fontSize: '1.25rem', paddingTop: '4px' }}>
              {formatTimeAgo(lastSync)}
            </div>
            <p className="stat-trend text-muted" style={{ fontSize: '0.75rem' }}>
              {lastSync ? new Date(lastSync).toLocaleTimeString() : 'Awaiting sync cycle'}
            </p>
          </div>
        </div>
      </div>

      {/* Sync Navigation Tabs */}
      <div className="sync-tabs-container">
        <div className="sync-tabs">
          <button 
            className={`sync-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <i className="fa-solid fa-diagram-project"></i>
            <span>Live Sync Overview</span>
          </button>

          <button 
            className={`sync-tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            <i className="fa-solid fa-list-check"></i>
            <span>Pending Records Queue</span>
            {pendingRecords.length > 0 && (
              <span className="tab-counter-badge">{pendingRecords.length}</span>
            )}
          </button>

          <button 
            className={`sync-tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
            onClick={() => setActiveTab('logs')}
          >
            <i className="fa-solid fa-receipt"></i>
            <span>Sync Audit Logs</span>
          </button>

          <button 
            className={`sync-tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <i className="fa-solid fa-sliders"></i>
            <span>Cloud &amp; GitHub Setup</span>
          </button>
        </div>
      </div>

      {/* TAB 1: OVERVIEW & QUICK ACTIONS */}
      {activeTab === 'overview' && (
        <div className="sync-tab-content">
          <div className="sync-workflow-card">
            <h3>
              <i className="fa-solid fa-arrows-split-up-and-left" style={{ color: '#0284c7', marginRight: '8px' }}></i>
              How Synchronization Works
            </h3>
            
            <div className="sync-steps-grid">
              <div className="sync-step-box">
                <div className="step-num">1</div>
                <h4>Remote / Mobile Entry</h4>
                <p>When you are away and your laptop is switched OFF, enter customer profiles on your phone or tablet. Unique IDs like <code>CUST-S-xxxx</code> are generated.</p>
              </div>

              <div className="sync-step-box">
                <div className="step-num">2</div>
                <h4>Secure Cloud Buffer</h4>
                <p>Records are held safely in the Temporary Cloud Queue with status <span className="badge badge-warning" style={{ display: 'inline-block' }}>Pending Sync</span>.</p>
              </div>

              <div className="sync-step-box">
                <div className="step-num">3</div>
                <h4>Switch Laptop ON</h4>
                <p>When you turn ON your laptop and start the server, it automatically connects to the cloud service, fetches all pending records, and inserts them into MySQL.</p>
              </div>

              <div className="sync-step-box">
                <div className="step-num">4</div>
                <h4>Clean &amp; Safe</h4>
                <p>Duplicate entries are strictly prevented. Temporary cloud copies are deleted <em>only after</em> MySQL insertion is verified. All customer records are safe.</p>
              </div>
            </div>
          </div>

          {/* Quick Pending Preview if any */}
          {pendingRecords.length > 0 && (
            <div className="card" style={{ marginTop: '1.5rem' }}>
              <div className="card-header">
                <div className="card-title-group">
                  <i className="fa-solid fa-hourglass-start" style={{ color: '#f59e0b' }}></i>
                  <div>
                    <h3>Pending Records Waiting for Laptop MySQL Sync</h3>
                    <p className="card-subtitle">These records will be inserted automatically into MySQL when laptop sync executes</p>
                  </div>
                </div>
                <button className="btn btn-primary btn-sm" onClick={handleSyncNow} disabled={syncing}>
                  <i className={`fa-solid fa-arrows-rotate ${syncing ? 'fa-spin' : ''}`}></i> Sync Now
                </button>
              </div>
              <div className="card-body no-padding">
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Unique ID</th>
                        <th>Customer Name</th>
                        <th>Mobile</th>
                        <th>Place</th>
                        <th>Bill Book</th>
                        <th>Page No</th>
                        <th>Device Source</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingRecords.slice(0, 5).map(record => (
                        <tr key={record.id}>
                          <td><span className="cust-id-badge">{record.id}</span></td>
                          <td><strong>{record.name}</strong></td>
                          <td>{record.mobile}</td>
                          <td>{record.place}</td>
                          <td><span className="bill-pill">{record.billBook}</span></td>
                          <td><span className="page-pill">{record.pageNo}</span></td>
                          <td><small>{record.device_source || 'Mobile Web'}</small></td>
                          <td>
                            <span className="badge badge-warning">
                              <i className="fa-solid fa-clock"></i> Pending Sync
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PENDING RECORDS QUEUE */}
      {activeTab === 'pending' && (
        <div className="sync-tab-content">
          <div className="card">
            <div className="card-header">
              <div className="card-title-group">
                <i className="fa-solid fa-list-check" style={{ color: '#0284c7' }}></i>
                <div>
                  <h3>Temporary Cloud Storage Queue</h3>
                  <p className="card-subtitle">
                    Holding {pendingRecords.length} pending customer record(s). These will be deleted from the cloud automatically after MySQL insertion.
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-outline btn-sm" onClick={loadSyncData}>
                  <i className="fa-solid fa-rotate"></i> Refresh Queue
                </button>
                <button className="btn btn-primary btn-sm" onClick={handleSyncNow} disabled={syncing}>
                  <i className={`fa-solid fa-arrows-rotate ${syncing ? 'fa-spin' : ''}`}></i> Sync All to MySQL
                </button>
              </div>
            </div>

            <div className="card-body no-padding">
              {pendingRecords.length === 0 ? (
                <div className="empty-state" style={{ padding: '3rem 1rem' }}>
                  <i className="fa-solid fa-cloud-check empty-icon" style={{ color: '#10b981' }}></i>
                  <h4>Temporary Cloud Queue is Empty!</h4>
                  <p>All customer records have been successfully synchronized to your laptop's MySQL database.</p>
                  <button className="btn btn-outline btn-sm" onClick={() => onNavigate('add-customer')}>
                    <i className="fa-solid fa-user-plus"></i> Add New Customer
                  </button>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Customer ID</th>
                        <th>Name</th>
                        <th>Mobile</th>
                        <th>Place</th>
                        <th>Bill Book</th>
                        <th>Page No</th>
                        <th>Queued Time</th>
                        <th>Device Origin</th>
                        <th>Sync Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingRecords.map(item => (
                        <tr key={item.id}>
                          <td><span className="cust-id-badge">{item.id}</span></td>
                          <td><strong>{item.name}</strong></td>
                          <td>{item.mobile}</td>
                          <td>{item.place}</td>
                          <td><span className="bill-pill">{item.billBook}</span></td>
                          <td><span className="page-pill">{item.pageNo}</span></td>
                          <td><small>{formatTimeAgo(item.queued_at)}</small></td>
                          <td><small>{item.device_source || 'Remote Web'}</small></td>
                          <td>
                            <span className="badge badge-warning">
                              <i className="fa-solid fa-hourglass-half"></i> Pending Sync
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SYNC AUDIT LOGS */}
      {activeTab === 'logs' && (
        <div className="sync-tab-content">
          <div className="card">
            <div className="card-header">
              <div className="card-title-group">
                <i className="fa-solid fa-receipt" style={{ color: '#0284c7' }}></i>
                <div>
                  <h3>Synchronization Audit Logs</h3>
                  <p className="card-subtitle">Permanent record of all sync cycles stored in MySQL (tailor_shop_db.sync_logs)</p>
                </div>
              </div>
              <button className="btn btn-outline btn-sm" onClick={loadSyncData}>
                <i className="fa-solid fa-rotate"></i> Refresh Logs
              </button>
            </div>

            <div className="card-body no-padding">
              {syncLogs.length === 0 ? (
                <div className="empty-state">
                  <i className="fa-solid fa-clipboard-list empty-icon"></i>
                  <h4>No Sync Logs Found Yet</h4>
                  <p>Audit logs will appear here after the first synchronization cycle executes.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Timestamp</th>
                        <th>Status</th>
                        <th>Records Synced</th>
                        <th>Trigger Source</th>
                        <th>Audit Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {syncLogs.map(log => (
                        <tr key={log.id}>
                          <td><code>{log.syncTime}</code></td>
                          <td>
                            <span className={`badge badge-${log.status === 'success' ? 'success' : log.status === 'warning' ? 'warning' : 'danger'}`}>
                              {log.status.toUpperCase()}
                            </span>
                          </td>
                          <td><strong>{log.recordsSynced}</strong></td>
                          <td><small>{log.deviceSource || 'system'}</small></td>
                          <td style={{ fontSize: '0.85rem' }}>{log.details}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SETTINGS & GITHUB SETUP GUIDE */}
      {activeTab === 'settings' && (
        <div className="sync-tab-content">
          <div className="grid-2-col" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {/* Cloud Queue Configuration */}
            <div className="card">
              <div className="card-header border-bottom">
                <div className="card-title-group">
                  <i className="fa-solid fa-gear" style={{ color: '#0284c7' }}></i>
                  <div>
                    <h3>Cloud Queue Settings</h3>
                    <p className="card-subtitle">Configure temporary storage endpoint for GitHub Pages or remote devices</p>
                  </div>
                </div>
              </div>

              <div className="card-body">
                <form onSubmit={handleSaveSettings}>
                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label className="form-label">Storage Provider:</label>
                    <select 
                      className="form-control"
                      value={settings.provider}
                      onChange={(e) => setSettings({ ...settings, provider: e.target.value })}
                    >
                      <option value="auto">Auto-Detect (Recommended)</option>
                      <option value="firebase">Firebase Realtime Database (100% Free Forever)</option>
                      <option value="relay">Custom Cloud Sync Relay (Vercel / Render)</option>
                      <option value="local">Built-in Local Relay (Testing on Laptop)</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label className="form-label">Firebase Database URL (if using Firebase):</label>
                    <input 
                      type="url"
                      className="form-control"
                      placeholder="https://your-tailor-shop-default-rtdb.firebaseio.com"
                      value={settings.firebaseDbUrl}
                      onChange={(e) => setSettings({ ...settings, firebaseDbUrl: e.target.value })}
                    />
                    <small className="form-text text-muted">
                      Free tier, zero server maintenance required. Perfect for GitHub Pages deployments.
                    </small>
                  </div>

                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label className="form-label">Cloud Relay URL (if using Custom Relay):</label>
                    <input 
                      type="url"
                      className="form-control"
                      placeholder="https://your-sync-relay.onrender.com"
                      value={settings.cloudSyncUrl}
                      onChange={(e) => setSettings({ ...settings, cloudSyncUrl: e.target.value })}
                    />
                    <small className="form-text text-muted">
                      The URL of your deployed <code>cloud-sync-relay</code> server (Render, Vercel, Railway).
                    </small>
                  </div>

                  <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                    <label className="form-label">Sync API Key (x-sync-api-key):</label>
                    <input 
                      type="text"
                      className="form-control"
                      value={settings.apiKey}
                      onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
                    />
                    <small className="form-text text-muted">
                      Shared secret protecting your temporary cloud queue from unauthorized access.
                    </small>
                  </div>

                  <button type="submit" className="btn btn-primary">
                    <i className="fa-solid fa-floppy-disk"></i> Save Cloud Settings
                  </button>

                  {settingsSaved && (
                    <span style={{ marginLeft: '1rem', color: '#10b981', fontWeight: 600 }}>
                      <i className="fa-solid fa-check"></i> Saved successfully!
                    </span>
                  )}
                </form>
              </div>
            </div>

            {/* GitHub Deployment & Mobile Access Guide */}
            <div className="card">
              <div className="card-header border-bottom">
                <div className="card-title-group">
                  <i className="fa-solid fa-mobile-screen-button" style={{ color: '#0284c7' }}></i>
                  <div>
                    <h3>Mobile &amp; GitHub Setup Guide</h3>
                    <p className="card-subtitle">How to access from phone when your laptop is switched OFF</p>
                  </div>
                </div>
              </div>

              <div className="card-body" style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>
                <h4 style={{ marginBottom: '0.5rem', color: '#0f2942' }}>
                  <i className="fa-solid fa-1" style={{ color: '#0284c7', marginRight: '6px' }}></i>
                  Accessing from Phones &amp; Other Computers
                </h4>
                <p style={{ marginBottom: '1rem' }}>
                  Open your application URL hosted online on GitHub. Add customer profiles anytime — even from home, on the go, or when your main laptop is powered completely OFF.
                </p>

                <h4 style={{ marginBottom: '0.5rem', color: '#0f2942' }}>
                  <i className="fa-solid fa-2" style={{ color: '#0284c7', marginRight: '6px' }}></i>
                  Zero Data Loss Guarantee
                </h4>
                <p style={{ marginBottom: '1rem' }}>
                  When entering data on your phone, records are instantly saved in device offline storage AND pushed to the temporary cloud queue. Records will NEVER be deleted until your laptop MySQL confirms successful insertion.
                </p>

                <h4 style={{ marginBottom: '0.5rem', color: '#0f2942' }}>
                  <i className="fa-solid fa-3" style={{ color: '#0284c7', marginRight: '6px' }}></i>
                  Automatic Laptop Synchronization
                </h4>
                <p>
                  Whenever you switch your laptop ON and start your server (<code>npm start</code>), it connects to the cloud queue, fetches every pending customer, inserts them into your laptop's MySQL database, and clears the temporary cloud copy.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
